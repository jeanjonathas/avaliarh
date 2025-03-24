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
            const test = await prisma.test.findUnique({
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
          // Buscar questões diretamente pela etapa
          const stageQuestions = await prisma.question.findMany({
            where: {
              stageId: stage.id
            },
            include: {
              options: true,
              categories: true
            },
            take: 10
          });
          
          console.log(`Encontradas ${stageQuestions.length} questões associadas à etapa ${stage.id}`);
          questions = stageQuestions;
        } catch (error) {
          console.error('Erro ao buscar questões:', error);
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

      // Verificar se a etapa é do tipo opinativa para embaralhar as alternativas
      if (stage.questionType === 'OPINION_MULTIPLE') {
        console.log('Embaralhando alternativas para perguntas opinativas');
        
        // Função para embaralhar array (algoritmo Fisher-Yates)
        const shuffleArray = (array: any[]) => {
          const newArray = [...array]; // Criar uma cópia para não modificar o original
          for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
          }
          return newArray;
        };
        
        // Embaralhar as alternativas de cada pergunta, mantendo o vínculo com a categoria
        questions = questions.map(question => {
          // Criar cópias das opções para não modificar os objetos originais
          const shuffledOptions = shuffleArray(question.options);
          
          // Retornar a pergunta com as opções embaralhadas
          return {
            ...question,
            options: shuffledOptions
          };
        });
        
        logs.push({
          timestamp: new Date().toISOString(),
          action: 'options_shuffled',
          details: { stageType: stage.questionType }
        });
      }

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
