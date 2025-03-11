import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Interface para log de diagnóstico
interface DiagnosticLog {
  timestamp: string;
  action: string;
  details: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { stageId, candidateId } = req.query
      const logs: DiagnosticLog[] = []

      // Registrar início da requisição
      logs.push({
        timestamp: new Date().toISOString(),
        action: 'request_start',
        details: { stageId, candidateId, query: req.query }
      })

      if (!stageId || typeof stageId !== 'string') {
        return res.status(400).json({ error: 'ID da etapa é obrigatório' })
      }

      // Verificar se stageId é um número (ordem da etapa) ou um UUID
      const isOrderNumber = /^\d+$/.test(stageId)
      
      // Variável para armazenar o testId
      let testId: string | null = null;
      
      // Se temos o candidateId, buscar o testId associado ao candidato
      if (candidateId && typeof candidateId === 'string') {
        console.log(`Buscando candidato com ID: ${candidateId}`);
        
        // Buscar o candidato com todos os detalhes para diagnóstico
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId }
        });
        
        if (candidate) {
          console.log('Candidato encontrado:', {
            id: candidate.id,
            name: candidate.name,
            testId: candidate.testId,
            inviteCode: candidate.inviteCode
          });
          
          if (candidate.testId) {
            testId = candidate.testId;
            
            // Buscar detalhes do teste para diagnóstico
            const test = await prisma.tests.findUnique({
              where: { id: testId }
            });
            
            console.log('Teste associado ao candidato:', test ? {
              id: test.id,
              title: test.title,
              description: test.description
            } : 'Teste não encontrado');
            
            logs.push({
              timestamp: new Date().toISOString(),
              action: 'found_test_id',
              details: { 
                candidateId, 
                testId,
                candidateName: candidate.name,
                inviteCode: candidate.inviteCode
              }
            });
          } else {
            console.log('Candidato não tem testId associado');
            logs.push({
              timestamp: new Date().toISOString(),
              action: 'no_test_id',
              details: { 
                candidateId,
                candidateName: candidate.name,
                inviteCode: candidate.inviteCode
              }
            });
          }
        } else {
          console.log(`Candidato com ID ${candidateId} não encontrado`);
          logs.push({
            timestamp: new Date().toISOString(),
            action: 'candidate_not_found',
            details: { candidateId }
          });
        }
      }

      // Buscar informações da etapa
      // Se temos um testId, buscamos a etapa específica desse teste
      let stage;
      
      if (testId) {
        // Buscar a etapa específica do teste
        const testStages = await prisma.testStage.findMany({
          where: {
            testId: testId
          },
          include: {
            stage: true
          },
          orderBy: {
            order: 'asc'
          }
        });
        
        logs.push({
          timestamp: new Date().toISOString(),
          action: 'test_stages_found',
          details: { testId, stageCount: testStages.length }
        });
        
        if (isOrderNumber) {
          // Se stageId é um número, encontrar a etapa correspondente à ordem no teste
          const order = parseInt(stageId);
          const testStage = testStages.find(ts => ts.order === order);
          stage = testStage?.stage;
          
          logs.push({
            timestamp: new Date().toISOString(),
            action: 'stage_by_order',
            details: { order, stageFound: !!stage, stageId: stage?.id }
          });
        } else {
          // Se stageId é um UUID, verificar se pertence ao teste
          const testStage = testStages.find(ts => ts.stageId === stageId);
          stage = testStage?.stage;
          
          logs.push({
            timestamp: new Date().toISOString(),
            action: 'stage_by_id',
            details: { stageId, stageFound: !!stage }
          });
        }
      }
      
      // Se não encontramos a etapa específica do teste ou não temos testId,
      // buscar a etapa diretamente (comportamento original)
      if (!stage) {
        stage = await prisma.stage.findFirst({
          where: isOrderNumber
            ? { order: parseInt(stageId) }
            : { id: stageId },
        });
        
        logs.push({
          timestamp: new Date().toISOString(),
          action: 'fallback_stage_search',
          details: { stageId, isOrderNumber, stageFound: !!stage }
        });
      }

      if (!stage) {
        return res.status(404).json({ error: 'Etapa não encontrada', logs })
      }

      // Buscar as perguntas da etapa com suas opções
      // Se temos um testId, precisamos buscar apenas as questões associadas a este teste
      let questions = [];
      
      if (testId) {
        console.log(`Buscando questões específicas do teste ${testId} para a etapa ${stage.id}`);
        
        try {
          // Usar SQL raw para ter mais controle sobre a consulta e buscar apenas as questões
          // que estão associadas a esta etapa E a este teste
          const rawQuestions = await prisma.$queryRaw`
            SELECT q.*, ts."testId", ts."stageId"
            FROM "Question" q
            JOIN "StageQuestion" sq ON q."id" = sq."questionId"
            JOIN "TestStage" ts ON sq."stageId" = ts."stageId"
            WHERE ts."testId" = ${testId}
            AND ts."stageId" = ${stage.id}
            LIMIT 10
          `;
          
          // Verificar se rawQuestions é um array e tem a propriedade length
          const questionsCount = Array.isArray(rawQuestions) ? rawQuestions.length : 0;
          console.log(`Encontradas ${questionsCount} questões específicas para o teste ${testId} e etapa ${stage.id}`);
          
          // Se encontramos questões, buscar as opções para cada uma delas
          if (Array.isArray(rawQuestions) && questionsCount > 0) {
            // Extrair os IDs das questões
            const questionIds = rawQuestions.map(q => q.id);
            
            // Buscar as questões completas com suas opções
            questions = await prisma.question.findMany({
              where: {
                id: { in: questionIds }
              },
              include: {
                options: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            });
          } else {
            console.log('Nenhuma questão específica encontrada via SQL raw');
          }
        } catch (error) {
          console.error('Erro ao buscar questões específicas via SQL raw:', error);
        }
        
        // Se não encontramos questões via SQL raw, tentar uma abordagem alternativa
        if (questions.length === 0) {
          console.log('Tentando abordagem alternativa para buscar questões...');
          
          try {
            // Buscar as questões associadas a esta etapa
            const stageQuestions = await prisma.stageQuestion.findMany({
              where: {
                stageId: stage.id
              },
              select: {
                questionId: true
              }
            });
            
            if (stageQuestions.length > 0) {
              const questionIds = stageQuestions.map(sq => sq.questionId);
              console.log(`Encontradas ${questionIds.length} questões associadas à etapa ${stage.id}`);
              
              // Limitar o número de questões para 3 (ou outro número desejado)
              const limitedQuestionIds = questionIds.slice(0, 3);
              
              questions = await prisma.question.findMany({
                where: {
                  id: { in: limitedQuestionIds }
                },
                include: {
                  options: {
                    select: {
                      id: true,
                      text: true,
                    },
                  },
                },
              });
              
              console.log(`Usando ${questions.length} questões limitadas da etapa ${stage.id}`);
            }
          } catch (error) {
            console.error('Erro na abordagem alternativa:', error);
          }
        }
      }
      
      // Se não temos testId ou não encontramos questões específicas, usar o comportamento original
      // mas limitando a 3 questões para evitar sobrecarga
      if (!testId || questions.length === 0) {
        console.log(`Usando fallback: buscando questões da etapa ${stage.id} com limite`);
        questions = await prisma.question.findMany({
          where: {
            stageId: stage.id, // Usar o ID real da etapa
          },
          take: 3, // Limitar a 3 questões
          include: {
            options: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        });
      }
      
      logs.push({
        timestamp: new Date().toISOString(),
        action: 'questions_found',
        details: { stageId: stage.id, questionCount: questions.length }
      })

      return res.status(200).json({
        stageTitle: stage.title,
        stageDescription: stage.description,
        questions,
        diagnosticLogs: logs,
        testId: testId
      })
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error)
      return res.status(500).json({ error: 'Erro ao buscar perguntas' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
