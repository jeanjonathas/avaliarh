import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

// Função auxiliar para converter BigInt para Number
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToNumber(obj[key]);
    }
    return result;
  }

  return obj;
}

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
      // Buscar estatísticas de etapas
      const stageStats = await prisma.$queryRaw`
        SELECT 
          s.id,
          s.title as name,
          ts."order" as "order",
          COUNT(DISTINCT r.id) as "totalResponses",
          SUM(CASE WHEN r."isCorrectOption" = true THEN 1 ELSE 0 END) as "correctResponses",
          CASE 
            WHEN COUNT(DISTINCT r.id) > 0 
            THEN ROUND(SUM(CASE WHEN r."isCorrectOption" = true THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT r.id), 1)
            ELSE 0 
          END as "successRate"
        FROM "Stage" s
        JOIN "TestStage" ts ON s.id = ts."stageId"
        JOIN "Test" t ON ts."testId" = t.id AND t.active = true
        LEFT JOIN "Question" q ON q."stageId" = s.id
        LEFT JOIN "Response" r ON r."questionId" = q.id AND r."candidateId" IN (
          SELECT c.id FROM "Candidate" c WHERE c."testId" = t.id
        )
        GROUP BY s.id, s.title, ts."order"
        ORDER BY ts."order", s.title
      `;
      
      console.log('Estatísticas de etapas:', stageStats);

      // Buscar estatísticas de candidatos
      const candidateStats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN c.completed = true THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN c.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN c.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN c.status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          ROUND(AVG(CASE WHEN c.score IS NOT NULL AND c.completed = true THEN 
            CASE WHEN c.score > 1 THEN c.score ELSE c.score * 100 END
            ELSE NULL END), 1) as "averageScore"
        FROM "Candidate" c
        JOIN "Test" t ON c."testId" = t.id
        WHERE t.active = true
      `;
      
      // Log para debug
      console.log('Estatísticas de candidatos:', candidateStats);

      // Calcular taxa de sucesso média esperada e real
      const expectedSuccessRate = 70; // Taxa de sucesso esperada (pode ser ajustada)
      
      // Calcular taxa de sucesso média real
      const totalCorrect = Array.isArray(stageStats) ? 
        stageStats.reduce((sum: number, stage: any) => sum + Number(stage.correctResponses || 0), 0) : 0;
      
      const totalResponses = Array.isArray(stageStats) ? 
        stageStats.reduce((sum: number, stage: any) => sum + Number(stage.totalResponses || 0), 0) : 0;
      
      const averageSuccessRate = totalResponses > 0 ? 
        parseFloat(((totalCorrect / totalResponses) * 100).toFixed(1)) : 0;
      
      console.log('Cálculo de taxa de sucesso:', { 
        totalCorrect, 
        totalResponses, 
        averageSuccessRate,
        expectedSuccessRate
      });
      
      // Calcular pontuações médias por etapa
      const averageStageScores = Array.isArray(stageStats) ? 
        stageStats.map((stage: any) => Number(stage.successRate)) : [];

      // Processar os dados antes de retornar
      const processedStageStats = Array.isArray(stageStats) ? stageStats.map((stage: any) => ({
        ...stage,
        totalResponses: Number(stage.totalResponses || 0),
        correctResponses: Number(stage.correctResponses || 0),
        successRate: Number(stage.successRate || 0)
      })) : [];

      // Retornar estatísticas
      return res.status(200).json(convertBigIntToNumber({
        stageStats: processedStageStats,
        candidateStats: candidateStats[0],
        expectedSuccessRate,
        averageSuccessRate,
        averageStageScores
      }))
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
          pending: 0,
          averageScore: 0
        },
        averageStageScores: []
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
