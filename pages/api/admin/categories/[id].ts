import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

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
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          questions: {
            select: {
              id: true,
              text: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' })
      }

      return res.status(200).json({
        ...category,
        questionsCount: category._count.questions,
      })
    } catch (error) {
      console.error('Erro ao buscar categoria:', error)
      return res.status(500).json({ error: 'Erro ao buscar categoria' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Nome da categoria é obrigatório' })
      }

      // Verificar se já existe outra categoria com o mesmo nome
      const existingCategory = await prisma.category.findFirst({
        where: {
          name,
          NOT: {
            id,
          },
        },
      })

      if (existingCategory) {
        return res.status(400).json({ error: 'Já existe outra categoria com este nome' })
      }

      // Atualizar a categoria
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          name,
          description,
        },
      })

      return res.status(200).json(updatedCategory)
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      return res.status(500).json({ error: 'Erro ao atualizar categoria' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se existem perguntas associadas à categoria
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' })
      }

      // Excluir a categoria (as relações many-to-many serão automaticamente desvinculadas)
      await prisma.category.delete({
        where: { id },
      })

      return res.status(200).json({ message: 'Categoria excluída com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      return res.status(500).json({ error: 'Erro ao excluir categoria' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
