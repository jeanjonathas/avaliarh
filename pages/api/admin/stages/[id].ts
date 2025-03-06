import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'

const prisma = new PrismaClient()

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
      const existingStage = await prisma.stage.findFirst({
        where: {
          order: Number(order),
          id: {
            not: id,
          },
        },
      })

      if (existingStage) {
        return res.status(400).json({ error: 'Já existe outra etapa com esta ordem' })
      }

      // Atualizar a etapa
      const stage = await prisma.stage.update({
        where: {
          id,
        },
        data: {
          title,
          description: description || null,
          order: Number(order),
        },
      })

      return res.status(200).json(stage)
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error)
      return res.status(500).json({ error: 'Erro ao atualizar etapa' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Excluir a etapa (as perguntas associadas serão excluídas automaticamente devido à relação onDelete: Cascade)
      await prisma.stage.delete({
        where: {
          id,
        },
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Erro ao excluir etapa:', error)
      return res.status(500).json({ error: 'Erro ao excluir etapa' })
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
