import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { Prisma } from '@prisma/client'

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
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar teste por ID usando SQL raw
      const tests = await prisma.$queryRaw`
        SELECT 
          t.id, 
          t.title, 
          t.description, 
          t."timeLimit", 
          t.active, 
          t."createdAt", 
          t."updatedAt"
        FROM "tests" t
        WHERE t.id = ${id}
      `;

      const test = Array.isArray(tests) && tests.length > 0 ? tests[0] : null;

      if (!test) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      // Buscar os estágios (etapas) associados ao teste usando a tabela TestStage
      console.log(`[API] Buscando etapas para o teste ${id}...`);
      const stages = await prisma.$queryRaw`
        SELECT 
          s.id,
          s.title,
          s.description,
          ts.order,
          ts.id as "testStageId",
          s."createdAt",
          s."updatedAt"
        FROM "Stage" s
        JOIN "TestStage" ts ON s.id = ts."stageId"
        WHERE ts."testId" = ${id}
        ORDER BY ts.order ASC
      `;
      
      const typedStages = stages as any[];
      console.log(`[API] ${typedStages.length} etapas encontradas para o teste ${id}`);
      console.log("[API] Etapas ordenadas por ts.order ASC:", typedStages.map(s => ({
        id: s.id,
        testStageId: s.testStageId,
        title: s.title,
        order: s.order
      })));
      
      // Verificar se há etapas com a mesma ordem
      const orderCounts = typedStages.reduce((acc, stage) => {
        acc[stage.order] = (acc[stage.order] || 0) + 1;
        return acc;
      }, {});
      
      const hasDuplicateOrders = Object.values(orderCounts).some(count => (count as number) > 1);
      
      if (hasDuplicateOrders) {
        console.log("[API] Detectadas etapas com a mesma ordem. Corrigindo...");
        
        // Corrigir as ordens para garantir que sejam sequenciais (0, 1, 2, ...)
        for (let i = 0; i < typedStages.length; i++) {
          const stage = typedStages[i];
          
          // Atualizar a ordem no banco de dados
          await prisma.$executeRaw`
            UPDATE "TestStage"
            SET "order" = ${i}
            WHERE id = ${stage.testStageId}
          `;
          
          // Atualizar a ordem no objeto para retornar ao cliente
          stage.order = i;
        }
        
        console.log("[API] Ordens corrigidas:", typedStages.map(s => ({
          id: s.id,
          testStageId: s.testStageId,
          title: s.title,
          order: s.order
        })));
      }
      
      console.log("Etapas obtidas da consulta SQL:", stages);

      // Se não encontrar nenhum estágio usando a nova tabela, tente buscar pelo método antigo
      let stagesData = Array.isArray(stages) && stages.length > 0 ? stages : [];
      
      if (stagesData.length === 0) {
        const oldStages = await prisma.$queryRaw`
          SELECT 
            id,
            title,
            description,
            "order",
            "createdAt",
            "updatedAt"
          FROM "Stage"
          WHERE "testId" = ${id}
          ORDER BY "order" ASC
        `;
        
        // Se encontrar estágios pelo método antigo, migre-os para a nova estrutura
        if (Array.isArray(oldStages) && oldStages.length > 0) {
          // Migrar estágios antigos para a nova estrutura
          for (let i = 0; i < oldStages.length; i++) {
            const stage = oldStages[i];
            
            // Verificar se já existe um registro na tabela TestStage
            const existingTestStage = await prisma.$queryRaw`
              SELECT id FROM "TestStage" 
              WHERE "testId" = ${id} AND "stageId" = ${stage.id}
            `;
            
            if (!Array.isArray(existingTestStage) || existingTestStage.length === 0) {
              // Criar registro na tabela TestStage
              await prisma.$executeRaw`
                INSERT INTO "TestStage" (
                  id,
                  "testId",
                  "stageId",
                  "order",
                  "createdAt",
                  "updatedAt"
                ) VALUES (
                  gen_random_uuid(),
                  ${id},
                  ${stage.id},
                  ${stage.order},
                  NOW(),
                  NOW()
                )
              `;
            }
          }
          
          // Buscar novamente os estágios usando a tabela TestStage após a migração
          const migratedStages = await prisma.$queryRaw`
            SELECT 
              s.id,
              s.title,
              s.description,
              ts.order,
              ts.id as "testStageId",
              s."createdAt",
              s."updatedAt"
            FROM "Stage" s
            JOIN "TestStage" ts ON s.id = ts."stageId"
            WHERE ts."testId" = ${id}
            ORDER BY ts.order ASC
          `;
          
          stagesData = Array.isArray(migratedStages) && migratedStages.length > 0 ? migratedStages : oldStages;
        }
      }

      // Formatar resposta
      const formattedTest = {
        ...test,
        stages: stagesData
      };

      // Para cada estágio, buscar as perguntas associadas
      if (Array.isArray(stagesData) && stagesData.length > 0) {
        const stagesWithQuestions = await Promise.all(stagesData.map(async (stage) => {
          // Buscar as questões associadas a este estágio usando a tabela TestQuestion
          console.log(`[API] Buscando questões para o estágio ${stage.id} do teste ${id}...`);
          
          // Primeiro, buscar as associações na tabela TestQuestion
          const testQuestions = await prisma.$queryRaw`
            SELECT 
              tq."id" as "testQuestionId",
              tq."questionId",
              tq."order"
            FROM "TestQuestion" tq
            WHERE tq."testId" = ${id} AND tq."stageId" = ${stage.id}
            ORDER BY tq."order" ASC
          `;
          
          console.log(`[API] ${Array.isArray(testQuestions) ? testQuestions.length : 0} questões encontradas na tabela TestQuestion para o estágio ${stage.id}`);
          
          // Se não encontrar questões na tabela TestQuestion, tentar buscar na tabela StageQuestion (compatibilidade)
          let questionIds = [];
          if (Array.isArray(testQuestions) && testQuestions.length > 0) {
            questionIds = testQuestions.map(tq => tq.questionId);
          } else {
            // Buscar na tabela StageQuestion como fallback
            const stageQuestions = await prisma.$queryRaw`
              SELECT "questionId"
              FROM "StageQuestion"
              WHERE "stageId" = ${stage.id}
            `;
            
            if (Array.isArray(stageQuestions) && stageQuestions.length > 0) {
              questionIds = stageQuestions.map(sq => sq.questionId);
            }
          }
          
          // Buscar os detalhes das questões
          let questions = [];
          if (questionIds.length > 0) {
            questions = await prisma.$queryRaw`
              SELECT 
                q.id,
                q.text,
                q."stageId",
                q."categoryId",
                q."createdAt",
                q."updatedAt"
              FROM "Question" q
              WHERE q.id IN (${Prisma.join(questionIds)})
            `;
          }

          // Para cada questão, buscar as opções e categorias
          const questionsWithOptions = await Promise.all((Array.isArray(questions) ? questions : []).map(async (question) => {
            console.log(`[API] Buscando opções e categorias para a questão ${question.id}...`);
            
            // Buscar opções
            const options = await prisma.$queryRaw`
              SELECT 
                id,
                text,
                "isCorrect",
                "questionId",
                "createdAt",
                "updatedAt"
              FROM "Option"
              WHERE "questionId" = ${question.id}
            `;
            
            // Buscar categorias associadas à questão
            const questionCategories = await prisma.$queryRaw`
              SELECT 
                c.id,
                c.name
              FROM "Category" c
              WHERE c.id = (
                SELECT "categoryId" FROM "Question" WHERE id = ${question.id} AND "categoryId" IS NOT NULL
              )
            `;
            
            console.log(`[API] Questão ${question.id}: ${Array.isArray(options) ? options.length : 0} opções, ${Array.isArray(questionCategories) ? questionCategories.length : 0} categorias`);

            return {
              ...question,
              options: Array.isArray(options) ? options : [],
              categories: Array.isArray(questionCategories) ? questionCategories : [],
              difficulty: 'medium' // Adicionar um valor padrão para a propriedade difficulty
            };
          }));

          return {
            ...stage,
            questions: questionsWithOptions
          };
        }));

        formattedTest.stages = stagesWithQuestions;
      }

      return res.status(200).json(formattedTest);
    } catch (error) {
      console.error('Erro ao buscar teste:', error);
      return res.status(500).json({ error: 'Erro ao buscar teste' });
    }
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { title, description, timeLimit, active } = req.body;

      if (req.method === 'PUT' && !title) {
        return res.status(400).json({ error: 'Título do teste é obrigatório' });
      }

      // Construir conjunto de campos a serem atualizados
      let updateFields = '';
      const updates = [];

      if (title !== undefined) {
        updates.push(`title = '${title}'`);
      }
      
      if (description !== undefined) {
        updates.push(`description = ${description ? `'${description}'` : 'NULL'}`);
      }
      
      if (timeLimit !== undefined) {
        updates.push(`"timeLimit" = ${timeLimit ? parseInt(timeLimit) : 'NULL'}`);
      }
      
      if (active !== undefined) {
        updates.push(`active = ${active}`);
      }
      
      updates.push(`"updatedAt" = NOW()`);
      
      updateFields = updates.join(', ');

      // Atualizar teste usando $executeRawUnsafe para evitar problemas com a interpolação de strings
      await prisma.$executeRawUnsafe(`
        UPDATE "tests"
        SET ${updateFields}
        WHERE id = '${id}'
      `);

      // Buscar teste atualizado
      const updatedTests = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "timeLimit", 
          active, 
          "createdAt", 
          "updatedAt"
        FROM "tests"
        WHERE id = ${id}
      `;

      const updatedTest = Array.isArray(updatedTests) && updatedTests.length > 0 ? updatedTests[0] : null;

      if (!updatedTest) {
        return res.status(404).json({ error: 'Teste não encontrado após atualização' });
      }

      return res.status(200).json(updatedTest);
    } catch (error) {
      console.error('Erro ao atualizar teste:', error);
      return res.status(500).json({ error: 'Erro ao atualizar teste' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se o teste existe
      const existingTests = await prisma.$queryRaw`
        SELECT id FROM "tests" WHERE id = ${id}
      `;

      if (!Array.isArray(existingTests) || existingTests.length === 0) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      // Excluir teste
      await prisma.$executeRaw`
        DELETE FROM "tests" WHERE id = ${id}
      `;

      return res.status(204).end();
    } catch (error) {
      console.error('Erro ao excluir teste:', error);
      return res.status(500).json({ error: 'Erro ao excluir teste' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
