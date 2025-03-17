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
      // Buscar todos os testes usando Prisma Client em vez de SQL raw
      const tests = await prisma.test.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          active: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      // Para cada teste, buscar a contagem de etapas e perguntas
      const testsWithCounts = await Promise.all(
        tests.map(async (test) => {
          try {
            // Contar etapas (stages) usando Prisma
            const stagesCount = await prisma.stage.count({
              where: {
                OR: [
                  { testId: test.id },
                  { TestStage: { some: { testId: test.id } } }
                ]
              },
              distinct: ['id']
            });
            
            // Contar perguntas em todas as etapas do teste usando Prisma
            const questionsCount = await prisma.testQuestion.count({
              where: {
                testId: test.id
              },
              distinct: ['questionId']
            });
            
            return {
              ...test,
              sectionsCount: stagesCount,
              questionsCount
            };
          } catch (countError) {
            console.error('Erro ao contar etapas para teste:', test.id, countError);
            return {
              ...test,
              sectionsCount: 0,
              questionsCount: 0
            };
          }
        })
      );

      // Corrigir o formato da resposta para incluir a propriedade 'tests'
      return res.status(200).json({ tests: testsWithCounts });
    } catch (error) {
      console.error('Erro ao buscar testes:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json({ tests: [] });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, timeLimit, active } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Título do teste é obrigatório' });
      }

      // Criar o teste usando Prisma Client
      const newTest = await prisma.test.create({
        data: {
          title,
          description,
          timeLimit: timeLimit ? parseInt(timeLimit) : null,
          active: active !== undefined ? active : true
        }
      });

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
