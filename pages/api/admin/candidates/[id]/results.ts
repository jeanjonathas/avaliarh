import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar autenticação
    const session = await getSession({ req })
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' })
    }

    // Verificar se é um método GET
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Método não permitido' })
    }

    const { id } = req.query

    // Buscar o candidato com seus progressos e respostas
    const candidate = await prisma.candidate.findUnique({
      where: { id: String(id) },
      include: {
        progresses: {
          include: {
            stage: true
          }
        },
        responses: {
          include: {
            question: {
              include: {
                options: true
              }
            }
          }
        },
        process: {
          include: {
            stages: true
          }
        }
      }
    })

    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado' })
    }

    // Calcular pontuação geral
    const totalQuestions = candidate.responses.length
    const correctAnswers = candidate.responses.filter(response => {
      const correctOption = response.question.options.find(opt => opt.isCorrect)
      return response.selectedOptionId === correctOption?.id
    }).length

    const score = {
      total: totalQuestions,
      correct: correctAnswers,
      percentage: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    }

    // Calcular pontuação por etapa
    const stageScores = candidate.process?.stages.map(stage => {
      const stageResponses = candidate.responses.filter(response => 
        response.question.stageId === stage.id
      )
      
      const stageCorrect = stageResponses.filter(response => {
        const correctOption = response.question.options.find(opt => opt.isCorrect)
        return response.selectedOptionId === correctOption?.id
      }).length

      return {
        id: stage.id,
        name: stage.name,
        total: stageResponses.length,
        correct: stageCorrect,
        percentage: stageResponses.length > 0 
          ? (stageCorrect / stageResponses.length) * 100 
          : 0
      }
    }) || []

    // Calcular pontuações por habilidade
    const skillScores = [
      'Raciocínio Lógico',
      'Matemática Básica',
      'Compreensão Verbal',
      'Aptidão Espacial',
      'Tomada de Decisão',
      'Gestão de Tempo e Produtividade',
      'Situações de Crise',
      'Comunicação',
      'Soft Skills',
      'Carreira'
    ].map(skill => {
      const skillResponses = candidate.responses.filter(response =>
        response.question.category === skill
      )

      const skillCorrect = skillResponses.filter(response => {
        const correctOption = response.question.options.find(opt => opt.isCorrect)
        return response.selectedOptionId === correctOption?.id
      }).length

      return {
        skill,
        total: skillResponses.length,
        correct: skillCorrect,
        percentage: skillResponses.length > 0 
          ? (skillCorrect / skillResponses.length) * 100 
          : 0
      }
    })

    // Retornar os resultados compilados
    return res.status(200).json({
      score,
      stageScores,
      skillScores,
      completed: candidate.completed,
      timeSpent: candidate.timeSpent || 0
    })

  } catch (error) {
    console.error('Erro ao buscar resultados do candidato:', error)
    return res.status(500).json({ 
      message: 'Erro interno ao buscar resultados do candidato' 
    })
  }
}
