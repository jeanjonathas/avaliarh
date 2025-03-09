import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

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
      // Buscar estatísticas por etapa usando SQL raw
      const stageStats = await prisma.$queryRaw`
        SELECT 
          s.id,
          s.title as name,
          s.order,
          COALESCE(COUNT(CASE WHEN o."isCorrect" = true THEN 1 ELSE NULL END), 0) as "correctResponses",
          COALESCE(COUNT(r.id), 0) as "totalResponses",
          CASE 
            WHEN COUNT(r.id) > 0 THEN 
              (COUNT(CASE WHEN o."isCorrect" = true THEN 1 ELSE NULL END)::float / COUNT(r.id)::float * 100)
            ELSE 0 
          END as "successRate"
        FROM "Stage" s
        LEFT JOIN "Question" q ON q."stageId" = s.id
        LEFT JOIN "Response" r ON r."questionId" = q.id
        LEFT JOIN "Option" o ON r."optionId" = o.id
        GROUP BY s.id, s.title, s.order
        ORDER BY s.order
      `;

      // Buscar estatísticas de candidatos
      const candidateStats = await prisma.$queryRaw`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN completed = true THEN 1 ELSE NULL END)::int as completed,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 ELSE NULL END)::int as approved,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 ELSE NULL END)::int as rejected,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 ELSE NULL END)::int as pending
        FROM "Candidate"
      `;

      // Calcular taxa de sucesso média esperada e real
      const expectedSuccessRate = 70; // Taxa de sucesso esperada (pode ser ajustada)
      
      // Calcular taxa de sucesso média real
      const totalCorrect = Array.isArray(stageStats) ? 
        stageStats.reduce((sum: number, stage: any) => sum + parseInt(stage.correctResponses), 0) : 0;
      
      const totalResponses = Array.isArray(stageStats) ? 
        stageStats.reduce((sum: number, stage: any) => sum + parseInt(stage.totalResponses), 0) : 0;
      
      const averageSuccessRate = totalResponses > 0 ? (totalCorrect / totalResponses) * 100 : 0;
      
      // Calcular pontuações médias por etapa
      const averageStageScores = Array.isArray(stageStats) ? 
        stageStats.map((stage: any) => parseFloat(stage.successRate)) : [];

      // Formatar resposta
      const statistics = {
        stageStats: Array.isArray(stageStats) ? stageStats : [],
        expectedSuccessRate,
        averageSuccessRate,
        candidateStats: Array.isArray(candidateStats) && candidateStats.length > 0 ? {
          total: parseInt(candidateStats[0].total),
          completed: parseInt(candidateStats[0].completed),
          approved: parseInt(candidateStats[0].approved),
          rejected: parseInt(candidateStats[0].rejected),
          pending: parseInt(candidateStats[0].pending)
        } : {
          total: 0,
          completed: 0,
          approved: 0, 
          rejected: 0,
          pending: 0
        },
        averageStageScores
      };

      return res.status(200).json(statistics);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      // Retornar dados vazios em vez de erro para não quebrar a UI
      return res.status(200).json({
        stageStats: [],
        expectedSuccessRate: 70,
        averageSuccessRate: 0,
        candidateStats: {
          total: 0,
          completed: 0,
          approved: 0,
          rejected: 0,
          pending: 0
        },
        averageStageScores: []
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
