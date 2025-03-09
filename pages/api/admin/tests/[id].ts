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

      // Buscar os estágios (etapas) associados ao teste
      const stages = await prisma.$queryRaw`
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

      // Formatar resposta
      const formattedTest = {
        ...test,
        stages: Array.isArray(stages) ? stages : []
      };

      // Para cada estágio, buscar as perguntas associadas
      if (Array.isArray(stages) && stages.length > 0) {
        const stagesWithQuestions = await Promise.all(stages.map(async (stage) => {
          // Buscar as questões associadas a este estágio
          const questions = await prisma.$queryRaw`
            SELECT 
              id,
              text,
              "stageId",
              "categoryId",
              "createdAt",
              "updatedAt"
            FROM "Question"
            WHERE "stageId" = ${stage.id}
          `;

          // Para cada questão, buscar as opções
          const questionsWithOptions = await Promise.all((Array.isArray(questions) ? questions : []).map(async (question) => {
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

            return {
              ...question,
              options: Array.isArray(options) ? options : []
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
