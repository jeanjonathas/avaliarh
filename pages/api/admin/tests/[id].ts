import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

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

      // Formatar resposta - não tentamos buscar seções do teste
      // já que a tabela TestSection não existe no banco de dados atual
      const formattedTest = {
        ...test,
        testStages: [] // Array vazio para evitar erros no frontend
      };

      // Tentar buscar os estágios do teste se a tabela TestStage existir
      try {
        const testStages = await prisma.$queryRaw`
          SELECT 
            ts.id,
            ts."testId",
            ts."stageId",
            ts."order",
            s.id as "stage_id",
            s.title as "stage_title",
            s.description as "stage_description"
          FROM "TestStage" ts
          JOIN "Stage" s ON ts."stageId" = s.id
          WHERE ts."testId" = ${id}
          ORDER BY ts."order" ASC
        `;

        if (Array.isArray(testStages) && testStages.length > 0) {
          // Para cada estágio, buscar as perguntas associadas
          const formattedStages = await Promise.all(testStages.map(async (ts) => {
            // Buscar as questões associadas a este estágio
            let questionStages = [];
            try {
              questionStages = await prisma.$queryRaw`
                SELECT 
                  qs.id,
                  qs."questionId",
                  qs."stageId",
                  qs."order",
                  q.id as "question_id",
                  q.text as "question_text",
                  q.difficulty as "question_difficulty"
                FROM "QuestionStage" qs
                JOIN "Question" q ON qs."questionId" = q.id
                WHERE qs."stageId" = ${ts.stageId}
                ORDER BY qs."order" ASC
              `;
            } catch (error) {
              console.error('Erro ao buscar perguntas do estágio:', error);
              // Se houver erro, continuar com array vazio
            }

            // Formatar as questões
            const formattedQuestions = await Promise.all((Array.isArray(questionStages) ? questionStages : []).map(async (qs) => {
              // Buscar opções e categorias para cada questão
              let options = [];
              let categories = [];
              
              try {
                options = await prisma.$queryRaw`
                  SELECT id, text, "isCorrect"
                  FROM "Option"
                  WHERE "questionId" = ${qs.questionId}
                `;
              } catch (error) {
                console.error('Erro ao buscar opções da questão:', error);
              }
              
              try {
                categories = await prisma.$queryRaw`
                  SELECT c.id, c.name
                  FROM "Category" c
                  JOIN "QuestionCategory" qc ON c.id = qc."categoryId"
                  WHERE qc."questionId" = ${qs.questionId}
                `;
              } catch (error) {
                console.error('Erro ao buscar categorias da questão:', error);
                // Tentar formato alternativo se o anterior falhar
                try {
                  categories = await prisma.$queryRaw`
                    SELECT c.id, c.name
                    FROM "Category" c
                    JOIN "CategoryQuestion" cq ON c.id = cq."categoryId"
                    WHERE cq."questionId" = ${qs.questionId}
                  `;
                } catch (error2) {
                  console.error('Erro ao buscar categorias da questão (formato alternativo):', error2);
                }
              }

              return {
                id: qs.id,
                questionId: qs.questionId,
                stageId: qs.stageId,
                order: qs.order,
                question: {
                  id: qs.question_id,
                  text: qs.question_text,
                  difficulty: qs.question_difficulty,
                  options: Array.isArray(options) ? options : [],
                  categories: Array.isArray(categories) ? categories : []
                }
              };
            }));

            return {
              id: ts.id,
              testId: ts.testId,
              stageId: ts.stageId,
              order: ts.order,
              stage: {
                id: ts.stage_id,
                title: ts.stage_title,
                description: ts.stage_description,
                questionStages: formattedQuestions
              }
            };
          }));

          formattedTest.testStages = formattedStages;
        }
      } catch (error) {
        console.error('Erro ao buscar estágios do teste:', error);
        // Se houver erro, continuar com array vazio para testStages
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
      
      // Atualizar o teste usando SQL raw com string de atualização
      const updateQuery = `
        UPDATE "tests"
        SET ${updates.join(', ')}
        WHERE id = '${id}'
      `;
      
      await prisma.$executeRawUnsafe(updateQuery);

      // Buscar o teste atualizado
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

      const updatedTest = Array.isArray(updatedTests) && updatedTests.length > 0 
        ? updatedTests[0] 
        : null;

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

      // Excluir o teste
      await prisma.$executeRaw`
        DELETE FROM "tests" WHERE id = ${id}
      `;

      return res.status(200).json({ success: true, message: 'Teste excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir teste:', error);
      return res.status(500).json({ error: 'Erro ao excluir teste' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
