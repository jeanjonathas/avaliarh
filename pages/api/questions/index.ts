import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { stageId } = req.query

      if (!stageId || typeof stageId !== 'string') {
        return res.status(400).json({ error: 'ID da etapa é obrigatório' })
      }

      // Verificar se stageId é um número (ordem da etapa) ou um UUID
      const isOrderNumber = /^\d+$/.test(stageId)

      // Buscar informações da etapa
      const stage = await prisma.stage.findFirst({
        where: isOrderNumber
          ? { order: parseInt(stageId) }
          : { id: stageId },
      })

      if (!stage) {
        return res.status(404).json({ error: 'Etapa não encontrada' })
      }

      // Buscar as perguntas da etapa com suas opções
      const questions = await prisma.question.findMany({
        where: {
          stageId: stage.id, // Usar o ID real da etapa
        },
        include: {
          options: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      })

      return res.status(200).json({
        stageTitle: stage.title,
        stageDescription: stage.description,
        questions,
      })
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error)
      return res.status(500).json({ error: 'Erro ao buscar perguntas' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
