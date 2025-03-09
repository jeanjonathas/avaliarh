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

  if (req.method === 'GET') {
    try {
      // Buscar todas as categorias com contagem de perguntas
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      })

      // Transformar os dados para incluir a contagem como uma propriedade
      const formattedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        questionsCount: category._count.questions,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      }))

      return res.status(200).json(formattedCategories)
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      return res.status(500).json({ error: 'Erro ao buscar categorias' })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Nome da categoria é obrigatório' })
      }

      // Verificar se já existe uma categoria com o mesmo nome
      const existingCategory = await prisma.category.findUnique({
        where: {
          name,
        },
      })

      if (existingCategory) {
        return res.status(400).json({ error: 'Já existe uma categoria com este nome' })
      }

      // Criar a categoria
      const category = await prisma.category.create({
        data: {
          name,
          description,
        },
      })

      return res.status(201).json(category)
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      return res.status(500).json({ error: 'Erro ao criar categoria' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
