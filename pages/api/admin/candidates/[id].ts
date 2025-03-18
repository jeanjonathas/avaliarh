import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { PrismaClient, Candidate, Response, Test, Stage, Question, Option, TestStage } from '@prisma/client'

// Função auxiliar para converter BigInt para Number
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToNumber(obj[key]);
    }
    return result;
  }

  return obj;
}

// Tipos para as relações
type CandidateWithRelations = Candidate & {
  responses: (Response & {
    question?: Question & {
      stage?: Stage;
      categories?: {
        id: string;
        name: string;
      }[];
    };
    option?: Option;
  })[];
  test?: Test & {
    testStages: (TestStage & {
      stage: Stage;
    })[];
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const prisma = new PrismaClient();
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    // GET - Buscar candidato por ID
    if (req.method === 'GET') {
      // Buscar o candidato com todas as relações necessárias
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        include: {
          test: {
            include: {
              testStages: {
                include: {
                  stage: true
                },
                orderBy: {
                  order: 'asc'
                }
              }
            }
          },
          responses: {
            include: {
              question: {
                include: {
                  stage: true,
                  categories: true
                }
              },
              option: true
            }
          }
        }
      }) as CandidateWithRelations | null;
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      // Mapear as respostas para incluir informações da etapa e categoria
      const processedResponses = candidate.responses.map(response => {
        const category = response.question?.categories?.[0];
        return {
          id: response.id,
          candidateId: response.candidateId,
          questionId: response.questionId,
          optionId: response.option?.id || '',
          questionText: response.questionText || response.question?.text || '',
          optionText: response.optionText || response.option?.text || '',
          isCorrectOption: response.isCorrect || response.option?.isCorrect || false,
          stageId: response.question?.stage?.id || '',
          stageName: response.question?.stage?.title || '',
          categoryId: category?.id || '',
          categoryName: category?.name || '',
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          timeSpent: response.timeSpent || 0
        };
      });

      // Verificar se o candidato completou o teste com base nas respostas
      let candidateCompleted = candidate.completed;
      let candidateStatus = candidate.status;
      if (processedResponses.length > 0 && (!candidate.completed || candidate.status === 'PENDING')) {
        candidateCompleted = true;
        candidateStatus = 'APPROVED';
      }

      // Obter os IDs das etapas que pertencem ao teste do candidato
      const testStages = candidate.test?.testStages || [];
      const stageMap = new Map();

      // Inicializar o mapa com todas as etapas do teste
      testStages.forEach(testStage => {
        if (testStage.stage) {
          stageMap.set(testStage.stage.id, {
            id: testStage.stage.id,
            name: testStage.stage.title,
            correct: 0,
            total: 0,
            order: testStage.order
          });
        }
      });

      // Processar respostas para calcular pontuações por etapa
      processedResponses.forEach(response => {
        if (response.stageId && stageMap.has(response.stageId)) {
          const stageData = stageMap.get(response.stageId);
          stageData.total += 1;
          
          if (response.isCorrectOption) {
            stageData.correct += 1;
          }
          
          stageMap.set(response.stageId, stageData);
        }
      });

      // Converter o mapa em array e calcular percentual para cada etapa
      const stageScores = Array.from(stageMap.values())
        .map(stage => ({
          ...stage,
          percentage: stage.total > 0 ? (stage.correct / stage.total * 100) : 0
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Calcular pontuação total
      const totalCorrect = stageScores.reduce((acc, stage) => acc + stage.correct, 0);
      const totalQuestions = stageScores.reduce((acc, stage) => acc + stage.total, 0);
      const percentageScore = totalQuestions > 0 ? (totalCorrect * 100 / totalQuestions) : 0;

      console.log(`Pontuação total calculada: ${totalCorrect}/${totalQuestions} (${percentageScore}%)`);

      // Atualizar o candidato com a pontuação calculada
      await prisma.candidate.update({
        where: { id },
        data: {
          score: Math.round(percentageScore),
          completed: candidateCompleted,
          status: candidateStatus
        }
      });

      // Formatar datas para evitar problemas de serialização
      const formattedCandidate = {
        ...candidate,
        testDate: candidate.testDate?.toISOString() || null,
        interviewDate: candidate.interviewDate?.toISOString() || null,
        inviteExpires: candidate.inviteExpires?.toISOString() || null,
        createdAt: candidate.createdAt.toISOString(),
        updatedAt: candidate.updatedAt.toISOString(),
        responses: processedResponses,
        stageScores,
        score: {
          correct: totalCorrect,
          total: totalQuestions,
          percentage: percentageScore
        }
      };

      return res.status(200).json(convertBigIntToNumber(formattedCandidate));
    }

    // PUT - Atualizar candidato
    if (req.method === 'PUT') {
      const { 
        name, 
        email, 
        phone, 
        position, 
        observations,
        status,
        rating,
        testDate,
        interviewDate,
        inviteCode,
        inviteExpires,
        instagram,
        showResults,
        score
      } = req.body;

      const existingCandidate = await prisma.candidate.findUnique({
        where: { id }
      });

      if (!existingCandidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          name: name || undefined,
          email: email || undefined,
          phone: phone !== undefined ? phone : undefined,
          position: position !== undefined ? position : undefined,
          observations: observations !== undefined ? observations : undefined,
          status: status || undefined,
          rating: rating !== undefined ? Number(rating) : undefined,
          testDate: testDate ? new Date(testDate) : undefined,
          interviewDate: interviewDate ? new Date(interviewDate) : undefined,
          inviteCode: inviteCode !== undefined ? inviteCode : undefined,
          inviteExpires: inviteExpires ? new Date(inviteExpires) : undefined,
          instagram: instagram !== undefined ? instagram : undefined,
          showResults: showResults !== undefined ? showResults : undefined,
          score: score !== undefined ? Number(score) : undefined
        }
      });

      return res.status(200).json(convertBigIntToNumber(updatedCandidate));
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}