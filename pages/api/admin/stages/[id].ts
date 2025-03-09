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
  } else if (req.method === 'GET') {
    try {
      // Verificar se a etapa existe antes de tentar buscar detalhes
      const stageExists = await prisma.$queryRaw`
        SELECT id FROM "Stage" WHERE id = ${id}
      `;

      if (!Array.isArray(stageExists) || stageExists.length === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      // Buscar a etapa com contagem de perguntas
      try {
        const stages = await prisma.$queryRaw`
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.order,
            COUNT(q.id) as "questionCount"
          FROM "Stage" s
          LEFT JOIN "Question" q ON q."stageId" = s.id
          WHERE s.id = ${id}
          GROUP BY s.id, s.title, s.description, s.order
        `;

        const stage = Array.isArray(stages) && stages.length > 0
          ? stages[0]
          : null;

        if (!stage) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }

        return res.status(200).json(stage);
      } catch (queryError) {
        console.error('Erro na consulta de etapa:', queryError);
        
        // Se houver erro na consulta com JOIN, tentar uma consulta mais simples
        const simpleStages = await prisma.$queryRaw`
          SELECT id, title, description, "order"
          FROM "Stage"
          WHERE id = ${id}
        `;

        const simpleStage = Array.isArray(simpleStages) && simpleStages.length > 0
          ? { ...simpleStages[0], questionCount: 0 }
          : null;

        if (!simpleStage) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }

        return res.status(200).json(simpleStage);
      }
    } catch (error) {
      console.error('Erro ao buscar etapa:', error);
      return res.status(500).json({ error: 'Erro ao buscar etapa' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
