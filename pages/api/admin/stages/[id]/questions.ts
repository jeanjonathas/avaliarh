import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import crypto from 'crypto'

// Função auxiliar para juntar elementos de um array com vírgulas
function joinArray(arr: any[]): string {
  return arr.map(item => `'${item}'`).join(',');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do estágio inválido' })
  }

  // Verificar se o estágio existe
  try {
    const stage = await prisma.stage.findUnique({
      where: { id },
      include: {
        test: true, // Incluir o teste associado à etapa
        TestStage: {
          include: {
            test: true
          }
        }
      }
    });

    if (!stage) {
      return res.status(404).json({ error: 'Estágio não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar estágio:', error);
    return res.status(500).json({ error: 'Erro ao verificar estágio' });
  }

  // Adicionar questões ao estágio (POST)
  if (req.method === 'POST') {
    try {
      const { questionIds } = req.body;

      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ error: 'Lista de IDs de questões é obrigatória' });
      }

      // Obter o estágio com o teste associado
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          test: true,
          TestStage: {
            include: {
              test: true
            }
          }
        }
      });

      if (!stage) {
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }
      
      // Verificar se o estágio está associado a um teste diretamente ou via TestStage
      let testId = stage.testId;
      
      // Se não houver testId direto, tentar obter do TestStage
      if (!testId && stage.TestStage && stage.TestStage.length > 0) {
        testId = stage.TestStage[0].testId;
      }
      
      if (!testId) {
        return res.status(404).json({ error: 'Estágio não está associado a nenhum teste' });
      }

      // Verificar se todas as questões existem
      const questions = await prisma.question.findMany({
        where: {
          id: {
            in: questionIds
          }
        }
      });

      if (questions.length !== questionIds.length) {
        return res.status(404).json({ error: 'Uma ou mais questões não foram encontradas' });
      }

      // Verificar quais questões já estão associadas a este teste e etapa usando SQL raw
      const existingAssociations = await prisma.$queryRaw`
        SELECT "questionId" FROM "TestQuestion" 
        WHERE "testId" = ${testId}::uuid AND "stageId" = ${id}::uuid AND "questionId" IN (${joinArray(questionIds)})
      `;
      
      console.log('Associações existentes:', existingAssociations);

      const existingQuestionIds = (existingAssociations as any[]).map(assoc => assoc.questionId);
      
      // Filtrar apenas as questões que ainda não estão associadas
      const newQuestionIds = questionIds.filter(qId => !existingQuestionIds.includes(qId));

      if (newQuestionIds.length === 0) {
        return res.status(400).json({ error: 'Todas as questões selecionadas já estão associadas a este teste e etapa' });
      }

      // Encontrar a maior ordem atual para adicionar as novas questões em sequência usando SQL raw
      const maxOrderResult = await prisma.$queryRaw`
        SELECT "order" FROM "TestQuestion" 
        WHERE "testId" = ${testId}::uuid AND "stageId" = ${id}::uuid
        ORDER BY "order" DESC
        LIMIT 1
      `;
      
      console.log('Resultado da consulta de ordem máxima:', maxOrderResult);
      
      const maxOrder = maxOrderResult && (maxOrderResult as any[])[0] ? (maxOrderResult as any[])[0].order : -1;
      
      let nextOrder = maxOrder >= 0 ? maxOrder + 1 : 0;

      // Criar associações entre as questões, o teste e a etapa na tabela TestQuestion
      const createdAssociations = [];
      for (const questionId of newQuestionIds) {
        // Manter a associação na tabela StageQuestion para compatibilidade
        try {
          const stageQuestionResult = await prisma.stageQuestion.upsert({
            where: {
              stageId_questionId: {
                stageId: id,
                questionId: questionId
              }
            },
            update: {
              order: nextOrder,
              updatedAt: new Date()
            },
            create: {
              stageId: id,
              questionId: questionId,
              order: nextOrder,
              updatedAt: new Date()
            }
          });
          console.log('StageQuestion criado/atualizado:', stageQuestionResult);
        } catch (error) {
          console.error('Erro ao criar/atualizar StageQuestion:', error);
          // Continuar mesmo com erro
        }
        
        // Criar a nova associação na tabela TestQuestion usando SQL raw
        const now = new Date(); // Usar objeto Date diretamente
        const uuid = crypto.randomUUID();
        
        console.log(`Inserindo TestQuestion: testId=${testId}, stageId=${id}, questionId=${questionId}, order=${nextOrder}`);
        
        await prisma.$executeRaw`
          INSERT INTO "TestQuestion" ("id", "testId", "stageId", "questionId", "order", "createdAt", "updatedAt")
          VALUES (${uuid}, ${testId}::uuid, ${id}::uuid, ${questionId}, ${nextOrder}, ${now}::timestamp, ${now}::timestamp)
        `;
        
        // Criar um objeto de associação para manter compatibilidade
        const associationObj = {
          id: uuid,
          testId,
          stageId: id,
          questionId,
          order: nextOrder,
          createdAt: now,
          updatedAt: now
        };
        
        nextOrder++;
        createdAssociations.push(associationObj);
      }

      return res.status(201).json({ 
        success: true,
        addedCount: newQuestionIds.length,
        alreadyExistingCount: existingQuestionIds.length,
        associations: createdAssociations
      });
    } catch (error) {
      console.error('Erro ao adicionar questões ao estágio:', error);
      return res.status(500).json({ error: 'Erro ao adicionar questões ao estágio' });
    }
  } 
  // Obter todas as questões de um estágio (GET)
  else if (req.method === 'GET') {
    try {
      // Obter o estágio com o teste associado
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          test: true,
          TestStage: {
            include: {
              test: true
            }
          }
        }
      });

      if (!stage) {
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }
      
      // Verificar se o estágio está associado a um teste diretamente ou via TestStage
      let testId = stage.testId;
      
      // Se não houver testId direto, tentar obter do TestStage
      if (!testId && stage.TestStage && stage.TestStage.length > 0) {
        testId = stage.TestStage[0].testId;
      }

      // Se o estágio estiver associado a um teste, buscar as questões associadas ao teste e etapa
      if (testId) {
        // Buscar as questões associadas ao teste e etapa usando SQL raw e depois buscar os detalhes das questões
        const testQuestionsRaw = await prisma.$queryRaw`
          SELECT tq."id" as "testQuestionId", tq."questionId", tq."order"
          FROM "TestQuestion" tq
          WHERE tq."testId" = ${testId}::uuid AND tq."stageId" = ${id}::uuid
          ORDER BY tq."order" ASC
        `;
        
        console.log('Resultado da consulta TestQuestion:', testQuestionsRaw);
        
        // Buscar os detalhes das questões
        const questionIds = (testQuestionsRaw as any[]).map(tq => tq.questionId);
        
        const questions = await prisma.question.findMany({
          where: {
            id: {
              in: questionIds
            }
          },
          include: {
            options: true,
            Category: true
          }
        });
        
        // Combinar os resultados
        const testQuestions = (testQuestionsRaw as any[]).map(tq => {
          const question = questions.find(q => q.id === tq.questionId);
          if (!question) {
            console.log(`Questão não encontrada para o ID: ${tq.questionId}`);
            return null;
          }
          return {
            ...question,
            order: tq.order,
            testQuestionId: tq.testQuestionId
          };
        }).filter(q => q !== null);

        // Os resultados já estão no formato esperado pelo frontend

        return res.status(200).json(testQuestions);
      } else {
        // Fallback para o comportamento antigo se o estágio não estiver associado a um teste
        const stageQuestions = await prisma.stageQuestion.findMany({
          where: {
            stageId: id
          },
          orderBy: {
            order: 'asc'
          },
          include: {
            question: {
              include: {
                options: true,
                Category: true
              }
            }
          }
        });

        // Transformar os resultados para manter a compatibilidade com o frontend
        const questions = stageQuestions.map(sq => ({
          ...sq.question,
          order: sq.order // Adicionar a ordem da questão no resultado
        }));

        return res.status(200).json(questions);
      }
    } catch (error) {
      console.error('Erro ao buscar questões do estágio:', error);
      return res.status(500).json({ error: 'Erro ao buscar questões do estágio' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
