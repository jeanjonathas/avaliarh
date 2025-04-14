import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar autenticação
    await reconnectPrisma()
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      console.log('[AUTH ERROR] Não autenticado na API de resultados')
      return res.status(401).json({ message: 'Não autorizado' })
    }

    // Verificar se é um método GET
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Método não permitido' })
    }

    const { id } = req.query

    // Buscar o candidato com seus progressos e respostas
    const candidate = await prisma.candidate.findUnique({
      where: { id: String(id) },
      include: {
        progresses: {
          include: {
            stage: {
              include: {
                test: true
              }
            }
          }
        },
        responses: {
          include: {
            question: {
              include: {
                options: true,
                stage: true
              }
            }
          }
        },
        process: {
          include: {
            stages: {
              include: {
                test: true,
                progresses: {
                  where: {
                    candidateId: String(id)
                  }
                }
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    })

    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado' })
    }

    // Calcular pontuação geral
    const totalQuestions = candidate.responses.length;
    const correctAnswers = candidate.responses.filter(response => {
      const correctOption = response.question.options.find(opt => opt.isCorrect);
      // Use type assertion to access selectedOptionId property
      return (response as any).selectedOptionId === correctOption?.id;
    }).length;

    // Separar respostas por tipo
    const multipleChoiceResponses = candidate.responses.filter(response => 
      response.question.options.some(opt => opt.isCorrect)
    );
    
    const opinionResponses = candidate.responses.filter(response => 
      !response.question.options.some(opt => opt.isCorrect)
    );

    // Calcular pontuação para questões de múltipla escolha
    const score = {
      total: totalQuestions,
      correct: correctAnswers,
      percentage: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    };

    // Calcular pontuação para questões opinativas (usando API de personality-data)
    let opinionScore = 0;
    let personalityData = null;
    
    // Verificar se o candidato tem um processo associado
    if (candidate.process?.id) {
      try {
        // Obter os dados de personalidade do processo
        const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
        const personalityResponse = await fetch(
          `${baseUrl}/api/admin/processes/${candidate.process.id}/personality-data`, 
          {
            headers: {
              'Cookie': req.headers.cookie || '',
            }
          }
        );
        
        if (personalityResponse.ok) {
          personalityData = await personalityResponse.json();
          
          // Calcular pontuação mesmo se não houver respostas opinativas
          // Isso é útil para mostrar a pontuação esperada baseada no perfil do processo
          if (personalityData && personalityData.groups && personalityData.groups.length > 0) {
            // Usar a mesma lógica do endpoint de performance:
            // Pegar os traços com maior peso em cada grupo
            let totalWeightedScore = 0;
            let groupCount = 0;
            
            personalityData.groups.forEach(group => {
              if (group.traits && group.traits.length > 0) {
                // Encontrar o traço com maior peso no grupo
                const maxWeightTrait = group.traits.reduce((max, trait) => 
                  trait.weight > max.weight ? trait : max, group.traits[0]);
                
                // Calcular o weightedScore como porcentagem do peso máximo (5)
                const traitWeightedScore = (maxWeightTrait.weight / 5) * 100;
                totalWeightedScore += traitWeightedScore;
                groupCount++;
                
                console.log(`Grupo ${group.name}: traço dominante ${maxWeightTrait.name} com peso ${maxWeightTrait.weight} (${traitWeightedScore}%)`);
              }
            });
            
            // Calcular média dos weightedScores dos traços dominantes
            if (groupCount > 0) {
              opinionScore = Math.round(totalWeightedScore / groupCount);
              console.log(`Pontuação opinativa calculada: ${opinionScore} (baseada em ${groupCount} grupos)`);
            }
          }
        } else {
          console.error('Erro ao buscar dados de personalidade:', await personalityResponse.text());
        }
      } catch (error) {
        console.error('Erro ao buscar dados de personalidade:', error);
      }
    } else {
      console.log('Candidato não tem processo associado, não é possível calcular pontuação opinativa');
    }

    // Calcular pontuação por etapa
    const stageScores = candidate.process?.stages.map(stage => {
      const progress = stage.progresses && stage.progresses.length > 0 ? stage.progresses[0] : null;
      const stageResponses = candidate.responses.filter(response => 
        response.question.stageId === stage.id
      );
      
      const stageCorrect = stageResponses.filter(response => {
        const correctOption = response.question.options.find(opt => opt.isCorrect);
        // Use type assertion to access selectedOptionId property
        return (response as any).selectedOptionId === correctOption?.id;
      }).length;

      return {
        id: stage.id,
        name: stage.name || (stage.test ? stage.test.title : null) || 'Etapa sem nome',
        total: stageResponses.length,
        correct: stageCorrect,
        percentage: stageResponses.length > 0 
          ? (stageCorrect / stageResponses.length) * 100 
          : 0,
        status: progress?.status || 'PENDING',
        type: stage.type || 'TEST',
        testScore: progress?.testScore,
        interviewScore: progress?.interviewScore,
        interviewNotes: progress?.interviewNotes,
        finalDecision: progress?.finalDecision || 'PENDING_EVALUATION'
      };
    }) || [];

    // Calcular pontuações por habilidade
    const skillScores = [
      'Raciocínio Lógico',
      'Matemática Básica',
      'Compreensão Verbal',
      'Aptidão Espacial',
      'Tomada de Decisão',
      'Gestão de Tempo e Produtividade',
      'Situações de Crise',
      'Comunicação',
      'Soft Skills',
      'Carreira'
    ].map(skill => {
      const skillResponses = candidate.responses.filter(response =>
        // Use type assertion to access category property
        (response.question as any).category === skill
      );

      const skillCorrect = skillResponses.filter(response => {
        const correctOption = response.question.options.find(opt => opt.isCorrect);
        // Use type assertion to access selectedOptionId property
        return (response as any).selectedOptionId === correctOption?.id;
      }).length;

      return {
        skill,
        total: skillResponses.length,
        correct: skillCorrect,
        percentage: skillResponses.length > 0 
          ? (skillCorrect / skillResponses.length) * 100 
          : 0
      };
    });

    // Calcular status geral do processo
    const processStatus = {
      currentStage: stageScores.find(stage => stage.status === 'PENDING')?.name || 'Processo Finalizado',
      overallStatus: candidate.overallStatus || 'PENDING_EVALUATION',
      cutoffScore: candidate.process?.cutoffScore,
      evaluationType: candidate.process?.evaluationType || 'SCORE_BASED',
      expectedProfile: candidate.process?.expectedProfile
    }

    // Retornar os resultados compilados
    return res.status(200).json({
      score,
      opinionScore,
      multipleChoiceResponses: multipleChoiceResponses.length,
      opinionResponses: opinionResponses.length,
      personalityData,
      stageScores,
      skillScores,
      completed: candidate.completed,
      timeSpent: candidate.timeSpent || 0,
      processStatus,
      processName: candidate.process?.name,
      jobPosition: candidate.process?.jobPosition,
      observations: candidate.observations,
      rating: candidate.rating,
      status: candidate.status
    })

  } catch (error) {
    console.error('Erro ao buscar resultados do candidato:', error)
    return res.status(500).json({ 
      message: 'Erro interno ao buscar resultados do candidato' 
    })
  }
}
