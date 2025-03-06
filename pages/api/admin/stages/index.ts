import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'

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
      // Buscar todas as etapas
      const stages = await prisma.stage.findMany({
        orderBy: {
          order: 'asc',
        },
      })

      // Para cada etapa, contar quantas perguntas existem
      const stagesWithQuestionCount = await Promise.all(
        stages.map(async (stage) => {
          const questionCount = await prisma.question.count({
            where: {
              stageId: stage.id,
            },
          })

          return { ...stage, questionCount }
        })
      )

      return res.status(200).json(stagesWithQuestionCount)
    } catch (error) {
      console.error('Erro ao buscar etapas:', error)
      return res.status(500).json({ error: 'Erro ao buscar etapas' })
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, order } = req.body

      if (!title || !order) {
        return res.status(400).json({ error: 'Título e ordem são obrigatórios' })
      }

      // Verificar se já existe uma etapa com a mesma ordem
      const existingStage = await prisma.stage.findFirst({
        where: {
          order: Number(order),
        },
      })

      if (existingStage) {
        return res.status(400).json({ error: 'Já existe uma etapa com esta ordem' })
      }

      // Criar nova etapa
      const stage = await prisma.stage.create({
        data: {
          title,
          description: description || null,
          order: Number(order),
        },
      })

      return res.status(201).json(stage)
    } catch (error) {
      console.error('Erro ao criar etapa:', error)
      return res.status(500).json({ error: 'Erro ao criar etapa' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
