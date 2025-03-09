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

  if (req.method === 'GET') {
    try {
      // Buscar todas as etapas com contagem de perguntas usando SQL raw
      const stages = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.title, 
          s.description, 
          s.order,
          COUNT(q.id) as "questionCount"
        FROM "Stage" s
        LEFT JOIN "Question" q ON q."stageId" = s.id
        GROUP BY s.id, s.title, s.description, s.order
        ORDER BY s.order ASC
      `;

      return res.status(200).json(Array.isArray(stages) ? stages : []);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, order } = req.body;

      if (!title || !order) {
        return res.status(400).json({ error: 'Título e ordem são obrigatórios' });
      }

      // Verificar se já existe uma etapa com a mesma ordem
      const existingStages = await prisma.$queryRaw`
        SELECT id FROM "Stage" WHERE "order" = ${Number(order)}
      `;

      if (Array.isArray(existingStages) && existingStages.length > 0) {
        return res.status(400).json({ error: 'Já existe uma etapa com esta ordem' });
      }

      // Criar nova etapa
      await prisma.$executeRaw`
        INSERT INTO "Stage" (
          id,
          title,
          description,
          "order",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          ${title},
          ${description || null},
          ${Number(order)},
          NOW(),
          NOW()
        )
      `;

      // Buscar a etapa recém-criada
      const newStages = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "order"
        FROM "Stage"
        WHERE title = ${title} AND "order" = ${Number(order)}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      const newStage = Array.isArray(newStages) && newStages.length > 0
        ? { ...newStages[0], questionCount: 0 }
        : { title, description, order: Number(order), questionCount: 0 };

      return res.status(201).json(newStage);
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      return res.status(500).json({ error: 'Erro ao criar etapa' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
