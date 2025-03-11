import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, Prisma } from '@prisma/client'

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

      // Salvar as respostas com snapshot das perguntas e opções
      const savedResponses = await Promise.all(
        responses.map(async (response: { questionId: string; optionId: string }) => {
          // Buscar informações completas da pergunta
          const question = await prisma.question.findUnique({
            where: { id: response.questionId },
            include: {
              options: true,
              Category: true,
              Stage: true
            }
          })

          if (!question) {
            console.error(`Pergunta não encontrada: ${response.questionId}`)
            return null
          }

          // Buscar informações da opção selecionada
          const selectedOption = await prisma.option.findUnique({
            where: { id: response.optionId }
          })

          if (!selectedOption) {
            console.error(`Opção não encontrada: ${response.optionId}`)
            return null
          }

          // Verificar se já existe uma resposta para esta pergunta
          const existingResponse = await prisma.response.findUnique({
            where: {
              candidateId_questionId: {
                candidateId,
                questionId: response.questionId,
              },
            },
          })

          // Preparar o snapshot de todas as opções como JSON
          const allOptionsSnapshot = question.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect
          }))

          // Preparar os dados com tipagem correta
          const responseData: any = {
            optionId: response.optionId,
            questionText: question.text,
            optionText: selectedOption.text,
            isCorrectOption: selectedOption.isCorrect,
            allOptionsSnapshot: JSON.stringify(allOptionsSnapshot) as Prisma.InputJsonValue,
            categoryName: question.Category?.name || null,
            stageName: question.Stage?.title || null
          };
          
          if (existingResponse) {
            // Atualizar resposta existente com snapshot atualizado
            return prisma.response.update({
              where: {
                id: existingResponse.id,
              },
              data: responseData,
            })
          } else {
            // Criar nova resposta com snapshot
            return prisma.response.create({
              data: {
                candidateId,
                questionId: response.questionId,
                ...responseData
              },
            })
          }
        })
      )

      // Filtrar respostas nulas (caso alguma pergunta ou opção não tenha sido encontrada)
      const validResponses = savedResponses.filter(response => response !== null)

      return res.status(201).json({ success: true, count: validResponses.length })
    } catch (error) {
      console.error('Erro ao salvar respostas:', error)
      return res.status(500).json({ error: 'Erro ao salvar respostas' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
