import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req })
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

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
                  stage: true
                }
              }
            }
          }
        }
      })

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }

      // Calcular estatísticas de desempenho
      const totalQuestions = candidate.responses.length
      const correctAnswers = candidate.responses.filter(r => r.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

      // Agrupar desempenho por etapa
      const stagePerformance = candidate.test?.testStages.map(testStage => {
        const stageResponses = candidate.responses.filter(
          r => r.question?.stageId === testStage.stage.id
        )
        
        const stageQuestions = stageResponses.length
        const stageCorrect = stageResponses.filter(r => r.isCorrect).length
        const stageAccuracy = stageQuestions > 0 ? (stageCorrect / stageQuestions) * 100 : 0
        
        return {
          stageId: testStage.stage.id,
          stageName: testStage.stage.title,
          totalQuestions: stageQuestions,
          correctAnswers: stageCorrect,
          incorrectAnswers: stageQuestions - stageCorrect,
          accuracy: stageAccuracy,
          weight: 1 // Valor padrão se não existir
        }
      }) || []

      // Calcular tempo médio por questão
      const avgTimePerQuestion = totalQuestions > 0 
        ? candidate.responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / totalQuestions 
        : 0

      // Calcular tempo total do teste
      const totalTime = candidate.timeSpent || 0

      return res.status(200).json({
        summary: {
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          accuracy
        },
        stagePerformance,
        avgTimePerQuestion,
        totalTime,
        testStartTime: candidate.testDate,
        testEndTime: candidate.completed ? new Date(candidate.testDate?.getTime() + (totalTime * 1000)) : null
      })
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar desempenho do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}
