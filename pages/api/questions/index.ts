import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma';

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
        
        console.log(`Encontradas ${testStages.length} etapas para o teste ${testId}:`, 
          testStages.map(ts => ({ 
            order: ts.order, 
            stageId: ts.stageId, 
            stageTitle: ts.stage?.title 
          }))
        );
        
        logs.push({
          timestamp: new Date().toISOString(),
          action: 'test_stages_found',
          details: { 
            testId, 
            stageCount: testStages.length,
            stages: testStages.map(ts => ({ order: ts.order, stageId: ts.stageId }))
          }
        });
        
        if (isOrderNumber) {
          // Se stageId é um número, encontrar a etapa correspondente à ordem no teste
          // Ajustar o ID da etapa para corresponder à ordem no banco de dados
          // Se o ID for um número (como "1"), precisamos ajustar para buscar a etapa com ordem (n-1)
          const originalOrder = parseInt(stageId);
          const order = originalOrder - 1;
          console.log(`Buscando etapa com ordem ${order} no teste ${testId} (ID original: ${originalOrder})`);
          
          // Verificar se a ordem está dentro do intervalo válido
          if (order <= 0 || order > testStages.length) {
            console.log(`Ordem ${order} inválida. O teste tem ${testStages.length} etapas.`);
            
            // Tentar usar a primeira etapa como fallback
            if (testStages.length > 0) {
              const firstStage = testStages[0];
              stage = firstStage.stage;
              console.log(`Usando primeira etapa como fallback: ${stage.id} (ordem ${firstStage.order})`);
            }
          } else {
            // Ajustar para índice baseado em zero se necessário
            // Algumas implementações podem usar ordem começando em 1, outras em 0
            const testStage = testStages.find(ts => ts.order === order);
            
            if (!testStage && order === 1 && testStages.length > 0) {
              // Caso especial: se a ordem é 1 mas não encontramos, pode ser que a ordem comece em 0
              const testStage = testStages.find(ts => ts.order === 0);
              if (testStage) {
                stage = testStage.stage;
                console.log(`Encontrada etapa com ordem 0 em vez de 1: ${stage.id}`);
              } else {
                // Tentar usar a primeira etapa, independente da ordem
                stage = testStages[0].stage;
                console.log(`Usando primeira etapa disponível: ${stage.id} (ordem ${testStages[0].order})`);
              }
            } else {
              stage = testStage?.stage;
              console.log(`Resultado da busca por ordem ${order}: ${stage ? `Encontrado: ${stage.id}` : 'Não encontrado'}`);
            }
          }
          
          logs.push({
            timestamp: new Date().toISOString(),
            action: 'stage_by_order',
            details: { 
              order, 
              stageFound: !!stage, 
              stageId: stage?.id,
              availableOrders: testStages.map(ts => ts.order)
            }
          });
        } else {
          // Se stageId é um UUID, verificar se pertence ao teste
          const testStage = testStages.find(ts => ts.stageId === stageId);
          stage = testStage?.stage;
          
          console.log(`Buscando etapa com ID ${stageId} no teste ${testId}: ${stage ? 'Encontrada' : 'Não encontrada'}`);
          
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
        console.log(`Fallback: buscando etapa diretamente ${isOrderNumber ? `com ordem ${stageId}` : `com ID ${stageId}`}`);
        
        if (isOrderNumber) {
          // Ajustar o ID da etapa para corresponder à ordem no banco de dados
          // Se o ID for um número (como "1"), precisamos ajustar para buscar a etapa com ordem (n-1)
          const originalOrder = parseInt(stageId);
          const order = originalOrder - 1;
          console.log(`Resultado da busca direta por ordem ${order} (ID original: ${originalOrder})`);
          
          stage = await prisma.stage.findFirst({
            where: { order },
          });
          console.log(`Resultado da busca direta por ordem ${order}: ${stage ? `Encontrado: ${stage.id}` : 'Não encontrado'}`);
        } else {
          stage = await prisma.stage.findUnique({
            where: { id: stageId },
          });
          console.log(`Resultado da busca direta por ID ${stageId}: ${stage ? 'Encontrado' : 'Não encontrado'}`);
        }
        
        logs.push({
          timestamp: new Date().toISOString(),
          action: 'fallback_stage_search',
          details: { stageId, isOrderNumber, stageFound: !!stage }
        });
      }

      if (!stage) {
        console.log(`ERRO: Etapa não encontrada para stageId=${stageId}, candidateId=${candidateId}, testId=${testId}`);
        return res.status(404).json({ 
          error: 'Etapa não encontrada', 
          logs,
          details: {
            stageId,
            candidateId,
            testId,
            isOrderNumber
          }
        });
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
            }
          });
          
          console.log(`Encontradas ${stageQuestions.length} questões associadas à etapa ${stage.id}`);
          questions = stageQuestions;
        } catch (error) {
          console.error('Erro ao buscar questões:', error);
        }
      }
      
      // Se não temos testId ou não encontramos questões específicas, usar o comportamento original
      if (!testId || questions.length === 0) {
        console.log(`Usando fallback: buscando questões da etapa ${stage.id}`);
        
        // Registrar aviso sobre a falta de testId
        if (!testId) {
          console.warn(`ATENÇÃO: Candidato ${candidateId} não tem testId associado. Isso pode causar problemas na exibição das questões corretas.`);
          
          // Se temos candidateId, tentar atualizar o candidato com o testId correto
          if (candidateId && typeof candidateId === 'string') {
            try {
              // Buscar o processo do candidato para tentar encontrar um teste associado
              const candidate = await prisma.candidate.findUnique({
                where: { id: candidateId },
                include: { 
                  process: { 
                    include: { 
                      stages: true 
                    } 
                  }
                }
              });
              
              if (candidate && candidate.process) {
                // Verificar se alguma etapa do processo tem um teste associado
                const processStages = candidate.process.stages;
                const testStage = processStages.find(stage => stage.testId);
                
                if (testStage && testStage.testId) {
                  console.log(`Encontrado testId ${testStage.testId} no processo do candidato. Atualizando candidato...`);
                  
                  // Atualizar o candidato com o testId encontrado
                  await prisma.candidate.update({
                    where: { id: candidateId },
                    data: { testId: testStage.testId }
                  });
                  
                  console.log(`Candidato ${candidateId} atualizado com testId ${testStage.testId}`);
                  
                  // Atualizar o testId em memória para usar nas próximas operações
                  testId = testStage.testId;
                  
                  // Tentar buscar questões novamente com o testId atualizado
                  try {
                    // Buscar as etapas do teste
                    const testStages = await prisma.testStage.findMany({
                      where: { testId },
                      include: { stage: true },
                      orderBy: { order: 'asc' }
                    });
                    
                    // Encontrar a etapa correspondente ao stageId
                    let matchingStage;
                    
                    if (isOrderNumber) {
                      const order = parseInt(stageId);
                      const testStage = testStages.find(ts => ts.order === order);
                      if (testStage) {
                        matchingStage = testStage.stage;
                      }
                    } else {
                      const testStage = testStages.find(ts => ts.stageId === stageId);
                      if (testStage) {
                        matchingStage = testStage.stage;
                      }
                    }
                    
                    if (matchingStage) {
                      // Atualizar a variável stage
                      stage = matchingStage;
                      
                      // Buscar questões específicas para esta etapa e teste
                      const stageQuestions = await prisma.question.findMany({
                        where: { stageId: stage.id },
                        include: {
                          options: true,
                          categories: true
                        }
                      });
                      
                      if (stageQuestions.length > 0) {
                        console.log(`Encontradas ${stageQuestions.length} questões após atualização do testId`);
                        questions = stageQuestions;
                        // Não precisamos continuar com o fallback
                        return res.status(200).json({
                          stageTitle: stage.title,
                          stageDescription: stage.description,
                          questions,
                          diagnosticLogs: logs,
                          testId: testId
                        });
                      }
                    }
                  } catch (error) {
                    console.error('Erro ao buscar questões após atualização do testId:', error);
                  }
                }
              }
            } catch (error) {
              console.error('Erro ao tentar atualizar candidato com testId:', error);
            }
          }
        }
        
        questions = await prisma.question.findMany({
          where: {
            stageId: stage.id, // Usar o ID real da etapa
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
