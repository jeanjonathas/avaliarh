import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

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
    return res.status(400).json({ error: 'ID do teste inválido' })
  }

  // Verificar se o teste existe
  try {
    const testExists = await prisma.$queryRaw`
      SELECT id FROM "tests" WHERE id = ${id}
    `;

    if (!Array.isArray(testExists) || testExists.length === 0) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar teste:', error);
    return res.status(500).json({ error: 'Erro ao verificar teste' });
  }

  // Atualizar a ordem das etapas (PATCH)
  if (req.method === 'PATCH') {
    try {
      const { stageOrders } = req.body;

      if (!Array.isArray(stageOrders) || stageOrders.length === 0) {
        return res.status(400).json({ error: 'É necessário fornecer um array com a ordem das etapas' });
      }

      // Verificar se todas as etapas existem e estão associadas ao teste
      for (const stageOrder of stageOrders) {
        const { stageId, order } = stageOrder;
        
        if (!stageId || typeof order !== 'number') {
          return res.status(400).json({ error: 'Cada item deve conter stageId e order' });
        }

        const stageExists = await prisma.$queryRaw`
          SELECT ts.id 
          FROM "TestStage" ts
          WHERE ts."stageId" = ${stageId} AND ts."testId" = ${id}
        `;

        if (!Array.isArray(stageExists) || stageExists.length === 0) {
          return res.status(404).json({ error: `Etapa com ID ${stageId} não encontrada ou não associada a este teste` });
        }
      }

      // Atualizar a ordem de cada etapa
      for (const stageOrder of stageOrders) {
        const { stageId, order } = stageOrder;
        
        await prisma.$executeRaw`
          UPDATE "TestStage"
          SET 
            "order" = ${order},
            "updatedAt" = NOW()
          WHERE "stageId" = ${stageId} AND "testId" = ${id}
        `;
      }

      // Buscar as etapas atualizadas
      const updatedStages = await prisma.$queryRaw`
        SELECT 
          s.id,
          s.title,
          s.description,
          ts.order,
          s."testId",
          s."createdAt",
          s."updatedAt"
        FROM "Stage" s
        JOIN "TestStage" ts ON s.id = ts."stageId"
        WHERE ts."testId" = ${id}
        ORDER BY ts.order ASC
      `;

      return res.status(200).json(updatedStages);
    } catch (error) {
      console.error('Erro ao atualizar ordem das etapas:', error);
      return res.status(500).json({ error: 'Erro ao atualizar ordem das etapas' });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
