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

  const { id, stageId } = req.query
  
  if (typeof id !== 'string' || typeof stageId !== 'string') {
    return res.status(400).json({ error: 'IDs inválidos' })
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

  // Remover estágio do teste (DELETE)
  if (req.method === 'DELETE') {
    try {
      // Usar uma abordagem mais simples com string literal para evitar problemas de tipo
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "Stage"
        SET "testId" = NULL, "updatedAt" = NOW()
        WHERE id = '${stageId}' AND "testId" = '${id}'
      `);

      if (result === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao remover etapa do teste:', error);
      return res.status(500).json({ error: 'Erro ao remover etapa do teste' });
    }
  } 
  // Atualizar ordem do estágio no teste (PATCH)
  else if (req.method === 'PATCH') {
    try {
      const { order } = req.body;

      if (order === undefined) {
        return res.status(400).json({ error: 'Ordem é obrigatória' });
      }

      const result = await prisma.$executeRawUnsafe(`
        UPDATE "Stage"
        SET "order" = ${order}, "updatedAt" = NOW()
        WHERE id = '${stageId}' AND "testId" = '${id}'
      `);

      if (result === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao atualizar ordem do estágio:', error);
      return res.status(500).json({ error: 'Erro ao atualizar ordem do estágio' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
