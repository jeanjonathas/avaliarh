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

  const { id, questionId } = req.query
  
  if (typeof id !== 'string' || typeof questionId !== 'string') {
    return res.status(400).json({ error: 'IDs inválidos' })
  }

  // Verificar se o estágio existe
  try {
    const stageExists = await prisma.$queryRaw`
      SELECT id FROM "Stage" WHERE id = ${id}
    `;

    if (!Array.isArray(stageExists) || stageExists.length === 0) {
      return res.status(404).json({ error: 'Estágio não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar estágio:', error);
    return res.status(500).json({ error: 'Erro ao verificar estágio' });
  }

  // Verificar se a relação estágio-questão existe
  try {
    const questionStageExists = await prisma.$queryRaw`
      SELECT id FROM "QuestionStage" 
      WHERE id = ${questionId} AND "stageId" = ${id}
    `;

    if (!Array.isArray(questionStageExists) || questionStageExists.length === 0) {
      return res.status(404).json({ error: 'Relação estágio-questão não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao verificar relação estágio-questão:', error);
    return res.status(500).json({ error: 'Erro ao verificar relação estágio-questão' });
  }

  // Remover questão do estágio (DELETE)
  if (req.method === 'DELETE') {
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "QuestionStage"
        WHERE id = '${questionId}' AND "stageId" = '${id}'
      `);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao remover questão do estágio:', error);
      return res.status(500).json({ error: 'Erro ao remover questão do estágio' });
    }
  } 
  // Atualizar ordem da questão no estágio (PATCH)
  else if (req.method === 'PATCH') {
    try {
      const { order } = req.body;

      if (order === undefined) {
        return res.status(400).json({ error: 'Ordem é obrigatória' });
      }

      await prisma.$executeRawUnsafe(`
        UPDATE "QuestionStage"
        SET "order" = ${order}, "updatedAt" = NOW()
        WHERE id = '${questionId}' AND "stageId" = '${id}'
      `);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao atualizar ordem da questão:', error);
      return res.status(500).json({ error: 'Erro ao atualizar ordem da questão' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
