import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar autenticação
    const session = await getSession({ req })
    if (!session) {
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

    const score = {
      total: totalQuestions,
      correct: correctAnswers,
      percentage: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    };

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
