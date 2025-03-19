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
                  Stage: true
                }
              },
              option: true
            }
          }
        }
      })

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }

      // Calcular estatísticas de desempenho
      const totalQuestions = candidate.responses.length
      const correctAnswers = candidate.responses.filter(r => r.option?.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

      // Agrupar desempenho por etapa
      const stagePerformance = candidate.test?.TestStage.map(testStage => {
        const stageResponses = candidate.responses.filter(
          r => r.question?.Stage?.id === testStage.stage.id
        )
        const stageCorrect = stageResponses.filter(r => r.option?.isCorrect).length
        const stageTotal = stageResponses.length
        const stageAccuracy = stageTotal > 0 ? (stageCorrect / stageTotal) * 100 : 0

        return {
          stageId: testStage.stage.id,
          stageName: testStage.stage.title,
          totalQuestions: stageTotal,
          correctAnswers: stageCorrect,
          incorrectAnswers: stageTotal - stageCorrect,
          accuracy: stageAccuracy
        }
      }) || []

      return res.status(200).json({
        summary: {
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          accuracy
        },
        stagePerformance,
        testCompleted: candidate.completed,
        startTime: candidate.startTime,
        endTime: candidate.endTime
      })
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar desempenho do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}
