import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

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
      // Buscar todos os candidatos com contagem de respostas corretas
      const candidates = await prisma.candidate.findMany({
        orderBy: {
          testDate: 'desc',
        },
        include: {
          responses: {
            include: {
              question: {
                include: {
                  stage: true
                }
              },
              option: true
            }
          }
        }
      })

      // Para cada candidato, calcular a pontuação
      const candidatesWithScore = await Promise.all(
        candidates.map(async (candidate) => {
          if (!candidate.completed) {
            return { ...candidate, score: undefined }
          }

          // Calcular a pontuação (porcentagem de respostas corretas)
          const correctResponses = candidate.responses.filter(r => r.option.isCorrect).length
          const totalResponses = candidate.responses.length
          const score = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0

          // Calcular pontuação por etapa
          const stageScores = {}
          candidate.responses.forEach(response => {
            const stageId = response.question.stageId
            const stageName = response.question.stage.title
            
            if (!stageScores[stageId]) {
              stageScores[stageId] = {
                name: stageName,
                correct: 0,
                total: 0,
                percentage: 0
              }
            }
            
            stageScores[stageId].total += 1
            if (response.option.isCorrect) {
              stageScores[stageId].correct += 1
            }
          })
          
          // Calcular porcentagens por etapa
          Object.keys(stageScores).forEach(stageId => {
            const stage = stageScores[stageId]
            stage.percentage = Math.round((stage.correct / stage.total) * 100)
          })

          return { 
            ...candidate, 
            score,
            stageScores: Object.values(stageScores),
            responses: undefined // Não enviar todas as respostas para reduzir o tamanho da resposta
          }
        })
      )

      return res.status(200).json(candidatesWithScore)
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error)
      return res.status(500).json({ error: 'Erro ao buscar candidatos' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
