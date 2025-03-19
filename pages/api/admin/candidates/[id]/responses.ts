import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req })
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ message: 'Não autorizado' })
    }

    const { id } = req.query

    if (req.method === 'GET') {
      const candidate = await prisma.candidate.findUnique({
        where: { id: String(id) },
        include: {
          test: {
            include: {
              TestStage: {
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
                  Stage: true,
                  options: true
                }
              },
              option: true
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

      // Processar as respostas para incluir snapshots e informações adicionais
      const processedResponses = candidate.responses.map(response => {
        const questionSnapshot = {
          id: response.question?.id,
          text: response.question?.text,
          categoryId: response.question?.categoryId,
          categoryName: response.question?.categoryName,
          options: response.question?.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect
          }))
        }

        return {
          ...response,
          questionSnapshot,
          questionText: response.question?.text,
          optionText: response.option?.text,
          stageName: response.question?.Stage?.title,
          categoryName: response.question?.categoryName,
          isCorrectOption: response.option?.isCorrect
        }
      })

      return res.status(200).json({
        ...candidate,
        responses: processedResponses
      })
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar respostas do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}
