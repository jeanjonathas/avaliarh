import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req })
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    console.log('NextAuth Session: Papel do usuário:', session.user?.role)

    const { id } = req.query

    if (req.method === 'GET') {
      const candidate = await prisma.candidate.findUnique({
        where: { id: String(id) },
        include: {
          test: {
            include: {
              testStages: {
                include: {
                  stage: true
                }
              }
            }
          },
          responses: {
            include: {
              question: {
                include: {
                  stage: true,
                  options: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }

      // Processar as respostas para incluir informações adicionais
      const processedResponses = candidate.responses.map(response => {
        // Criar um snapshot da questão para cada resposta
        const questionSnapshot = {
          id: response.question?.id,
          text: response.question?.text,
          options: response.question?.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect
          }))
        }

        // Retornar a resposta com informações adicionais
        return {
          id: response.id,
          questionId: response.questionId,
          questionText: response.questionText,
          optionText: response.optionText,
          isCorrect: response.isCorrect,
          timeSpent: response.timeSpent,
          createdAt: response.createdAt,
          stageId: response.stageId || response.question?.stage?.id,
          stageName: response.stageName || response.question?.stage?.title,
          categoryName: response.categoryName,
          question: questionSnapshot,
          optionId: response.optionId
        }
      })

      return res.status(200).json(processedResponses)
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar respostas do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}
