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
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID da etapa é obrigatório' })
  }

  if (req.method === 'PUT') {
    try {
      const { title, description, order } = req.body

      if (!title || !order) {
        return res.status(400).json({ error: 'Título e ordem são obrigatórios' })
      }

      // Verificar se já existe outra etapa com a mesma ordem (exceto a atual)
      const existingStages = await prisma.$queryRaw`
        SELECT id FROM "Stage" 
        WHERE "order" = ${Number(order)} AND id != ${id}
      `;

      if (Array.isArray(existingStages) && existingStages.length > 0) {
        return res.status(400).json({ error: 'Já existe outra etapa com esta ordem' })
      }

      // Atualizar a etapa usando SQL raw
      await prisma.$executeRaw`
        UPDATE "Stage"
        SET 
          title = ${title},
          description = ${description || null},
          "order" = ${Number(order)},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;

      // Buscar a etapa atualizada
      const updatedStages = await prisma.$queryRaw`
        SELECT id, title, description, "order"
        FROM "Stage"
        WHERE id = ${id}
      `;

      const updatedStage = Array.isArray(updatedStages) && updatedStages.length > 0
        ? updatedStages[0]
        : null;

      if (!updatedStage) {
        return res.status(404).json({ error: 'Etapa não encontrada após atualização' });
      }

      return res.status(200).json(updatedStage);
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar etapa' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se a etapa existe
      const existingStages = await prisma.$queryRaw`
        SELECT id FROM "Stage" WHERE id = ${id}
      `;

      if (!Array.isArray(existingStages) || existingStages.length === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      // Excluir a etapa usando SQL raw
      await prisma.$executeRaw`DELETE FROM "Stage" WHERE id = ${id}`;

      return res.status(204).end();
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      return res.status(500).json({ error: 'Erro ao excluir etapa' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
