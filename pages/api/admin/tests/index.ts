import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  if (req.method === 'GET') {
    try {
      // Buscar todos os testes de forma mais simples
      const tests = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "timeLimit", 
          active, 
          "createdAt", 
          "updatedAt"
        FROM "tests"
        ORDER BY "createdAt" DESC
      `;

      // Converter para array se não for
      const testsArray = Array.isArray(tests) ? tests : [];
      
      // Para cada teste, buscar a contagem de estágios e perguntas
      const testsWithCounts = await Promise.all(
        testsArray.map(async (test) => {
          try {
            // Contar estágios
            const stagesCountResult = await prisma.$queryRaw`
              SELECT COUNT(*) as count
              FROM "TestStage"
              WHERE "testId" = ${test.id}
            `;
            
            const sectionsCount = Array.isArray(stagesCountResult) && stagesCountResult.length > 0
              ? Number(stagesCountResult[0].count)
              : 0;
              
            return {
              ...test,
              sectionsCount,
              questionsCount: 0 // Por enquanto, definimos como 0
            };
          } catch (countError) {
            console.error('Erro ao contar estágios para teste:', test.id, countError);
            return {
              ...test,
              sectionsCount: 0,
              questionsCount: 0
            };
          }
        })
      );

      return res.status(200).json(testsWithCounts);
    } catch (error) {
      console.error('Erro ao buscar testes:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, timeLimit, active } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Título do teste é obrigatório' });
      }

      // Criar o teste usando SQL raw
      await prisma.$executeRaw`
        INSERT INTO "tests" (
          id, 
          title, 
          description, 
          "timeLimit", 
          active, 
          "createdAt", 
          "updatedAt"
        ) VALUES (
          gen_random_uuid(), 
          ${title}, 
          ${description || null}, 
          ${timeLimit ? parseInt(timeLimit) : null}, 
          ${active !== undefined ? active : true}, 
          NOW(), 
          NOW()
        )
      `;

      // Buscar o teste recém-criado
      const newTests = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "timeLimit", 
          active, 
          "createdAt", 
          "updatedAt"
        FROM "tests"
        WHERE title = ${title}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      const newTest = Array.isArray(newTests) && newTests.length > 0 ? newTests[0] : null;

      if (!newTest) {
        return res.status(500).json({ error: 'Erro ao buscar teste criado' });
      }

      return res.status(201).json(newTest);
    } catch (error) {
      console.error('Erro ao criar teste:', error);
      return res.status(500).json({ error: 'Erro ao criar teste' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
