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

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID da pergunta é obrigatório' })
  }

  if (req.method === 'PUT') {
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

      // Atualizar a pergunta
      const updatedQuestion = await prisma.$transaction(async (prisma) => {
        // Primeiro, atualizar a pergunta
        const question = await prisma.question.update({
          where: {
            id,
          },
          data: {
            text,
            stageId,
          },
        })

        // Excluir todas as opções existentes
        await prisma.option.deleteMany({
          where: {
            questionId: id,
          },
        })

        // Criar novas opções
        const newOptions = await Promise.all(
          options.map(option => 
            prisma.option.create({
              data: {
                text: option.text,
                isCorrect: option.isCorrect,
                questionId: id,
              },
            })
          )
        )

        return {
          ...question,
          options: newOptions,
        }
      })

      return res.status(200).json(updatedQuestion)
    } catch (error) {
      console.error('Erro ao atualizar pergunta:', error)
      return res.status(500).json({ error: 'Erro ao atualizar pergunta' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Excluir a pergunta (as opções associadas serão excluídas automaticamente devido à relação onDelete: Cascade)
      await prisma.question.delete({
        where: {
          id,
        },
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error)
      return res.status(500).json({ error: 'Erro ao excluir pergunta' })
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
