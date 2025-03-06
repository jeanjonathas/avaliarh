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
      // Buscar todas as perguntas com suas opções
      const questions = await prisma.question.findMany({
        include: {
          options: true,
          stage: {
            select: {
              title: true,
              order: true,
            },
          },
        },
        orderBy: {
          stage: {
            order: 'asc',
          },
        },
      })

      return res.status(200).json(questions)
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error)
      return res.status(500).json({ error: 'Erro ao buscar perguntas' })
    }
  } else if (req.method === 'POST') {
    try {
      const { text, stageId, options } = req.body

      if (!text || !stageId || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Dados inválidos' })
      }

      // Verificar se a etapa existe
      const stage = await prisma.stage.findUnique({
        where: {
          id: stageId,
        },
      })

      if (!stage) {
        return res.status(404).json({ error: 'Etapa não encontrada' })
      }

      // Verificar se pelo menos uma opção está marcada como correta
      const hasCorrectOption = options.some(option => option.isCorrect)
      if (!hasCorrectOption) {
        return res.status(400).json({ error: 'Pelo menos uma opção deve ser marcada como correta' })
      }

      // Criar a pergunta com suas opções
      const question = await prisma.question.create({
        data: {
          text,
          stageId,
          options: {
            create: options.map(option => ({
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          },
        },
        include: {
          options: true,
        },
      })

      return res.status(201).json(question)
    } catch (error) {
      console.error('Erro ao criar pergunta:', error)
      return res.status(500).json({ error: 'Erro ao criar pergunta' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
