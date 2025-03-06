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

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de candidato inválido' })
  }

  if (req.method === 'GET') {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id },
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

      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }

      // Calcular pontuação geral
      let score = 0
      if (candidate.completed && candidate.responses.length > 0) {
        const correctResponses = candidate.responses.filter(r => r.option.isCorrect).length
        score = Math.round((correctResponses / candidate.responses.length) * 100)
      }

      // Calcular pontuação por etapa
      const stageScores = {}
      candidate.responses.forEach(response => {
        const stageId = response.question.stageId
        const stageName = response.question.stage.title
        
        if (!stageScores[stageId]) {
          stageScores[stageId] = {
            id: stageId,
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

      return res.status(200).json({
        ...candidate,
        score,
        stageScores: Object.values(stageScores)
      })
    } catch (error) {
      console.error('Erro ao buscar candidato:', error)
      return res.status(500).json({ error: 'Erro ao buscar candidato' })
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        name,
        email,
        phone,
        position,
        status,
        rating,
        observations,
        infoJobsLink,
        socialMediaUrl,
        interviewDate
      } = req.body

      // Validação básica
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' })
      }

      // Atualizar o candidato
      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          position,
          status: status || 'PENDING',
          rating: rating ? parseFloat(rating) : null,
          observations,
          infoJobsLink,
          socialMediaUrl,
          interviewDate: interviewDate ? new Date(interviewDate) : null
        }
      })

      return res.status(200).json(updatedCandidate)
    } catch (error) {
      console.error('Erro ao atualizar candidato:', error)
      return res.status(500).json({ error: 'Erro ao atualizar candidato' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
