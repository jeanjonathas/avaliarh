import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

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
      // Buscar todas as etapas
      const stages = await prisma.stage.findMany({
        orderBy: {
          order: 'asc',
        },
      })

      // Buscar todas as respostas com suas opções e questões
      const responses = await prisma.response.findMany({
        include: {
          option: true,
          question: {
            include: {
              stage: true,
            },
          },
        },
      })

      // Calcular estatísticas por etapa
      const stageStats = stages.map(stage => {
        const stageResponses = responses.filter(r => r.question.stageId === stage.id)
        const correctResponses = stageResponses.filter(r => r.option.isCorrect).length
        const totalResponses = stageResponses.length
        const successRate = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0
        
        return {
          id: stage.id,
          name: stage.title,
          order: stage.order,
          correctResponses,
          totalResponses,
          successRate: Math.round(successRate),
        }
      })

      // Calcular média de pontuação por etapa para todos os candidatos
      const candidatesWithScores = await prisma.candidate.findMany({
        where: { completed: true },
        include: {
          responses: true
        },
      });

      // Calcular a média de pontuação para cada etapa
      const averageStageScores = Array(6).fill(0); // 6 etapas de teste
      
      if (candidatesWithScores.length > 0) {
        // Inicializar arrays para somar as pontuações
        const stageTotals = Array(6).fill(0);
        const stageCounts = Array(6).fill(0);
        
        // Agrupar respostas por etapa e calcular pontuações
        candidatesWithScores.forEach(candidate => {
          if (candidate.responses) {
            // Agrupar respostas por etapa
            const responsesByStage = candidate.responses.reduce((acc, response) => {
              const stageId = response.question?.stageId;
              if (stageId) {
                if (!acc[stageId]) {
                  acc[stageId] = { correct: 0, total: 0 };
                }
                if (response.option?.isCorrect) {
                  acc[stageId].correct++;
                }
                acc[stageId].total++;
              }
              return acc;
            }, {});
            
            // Calcular percentuais e adicionar aos totais
            Object.entries(responsesByStage).forEach(([stageId, scores]) => {
              const stageIndex = parseInt(stageId) - 1;
              if (stageIndex >= 0 && stageIndex < 6) {
                const percentage = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0;
                stageTotals[stageIndex] += percentage;
                stageCounts[stageIndex]++;
              }
            });
          }
        });
        
        // Calcular as médias
        for (let i = 0; i < 6; i++) {
          averageStageScores[i] = stageCounts[i] > 0 
            ? Math.round(stageTotals[i] / stageCounts[i]) 
            : 0;
        }
      }

      // Calcular taxa de acerto esperada (pode ser ajustada conforme necessário)
      const expectedSuccessRate = 70 // 70% como taxa de acerto esperada

      // Calcular taxa de acerto média geral
      const totalCorrectResponses = responses.filter(r => r.option.isCorrect).length
      const totalResponses = responses.length
      const averageSuccessRate = totalResponses > 0 
        ? Math.round((totalCorrectResponses / totalResponses) * 100) 
        : 0

      // Estatísticas de candidatos
      const totalCandidates = await prisma.candidate.count()
      const completedCandidates = await prisma.candidate.count({
        where: { completed: true }
      })
      const approvedCandidates = await prisma.candidate.count({
        where: { status: 'APPROVED' }
      })
      const rejectedCandidates = await prisma.candidate.count({
        where: { status: 'REJECTED' }
      })
      const pendingCandidates = await prisma.candidate.count({
        where: { status: 'PENDING' }
      })

      return res.status(200).json({
        stageStats,
        averageStageScores,
        expectedSuccessRate,
        averageSuccessRate,
        candidateStats: {
          total: totalCandidates,
          completed: completedCandidates,
          approved: approvedCandidates,
          rejected: rejectedCandidates,
          pending: pendingCandidates
        }
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
