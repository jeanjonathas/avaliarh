import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { candidateId, responses } = req.body

      if (!candidateId || !responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ error: 'Dados inválidos' })
      }

      // Verificar se o candidato existe
      const candidate = await prisma.candidate.findUnique({
        where: {
          id: candidateId,
        },
      })

      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }

      // Salvar as respostas
      const savedResponses = await Promise.all(
        responses.map(async (response: { questionId: string; optionId: string }) => {
          // Verificar se já existe uma resposta para esta pergunta
          const existingResponse = await prisma.response.findUnique({
            where: {
              candidateId_questionId: {
                candidateId,
                questionId: response.questionId,
              },
            },
          })

          if (existingResponse) {
            // Atualizar resposta existente
            return prisma.response.update({
              where: {
                id: existingResponse.id,
              },
              data: {
                optionId: response.optionId,
              },
            })
          } else {
            // Criar nova resposta
            return prisma.response.create({
              data: {
                candidateId,
                questionId: response.questionId,
                optionId: response.optionId,
              },
            })
          }
        })
      )

      return res.status(201).json({ success: true, count: savedResponses.length })
    } catch (error) {
      console.error('Erro ao salvar respostas:', error)
      return res.status(500).json({ error: 'Erro ao salvar respostas' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
