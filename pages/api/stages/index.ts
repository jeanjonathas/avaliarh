import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { candidateId } = req.query;
    
    if (!candidateId || typeof candidateId !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    // Buscar o testId associado ao candidato
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { testId: true }
    });
    
    if (!candidate || !candidate.testId) {
      return res.status(404).json({ 
        error: 'Candidato não encontrado ou sem teste associado',
        stages: []
      });
    }
    
    // Buscar todas as etapas do teste, ordenadas por ordem
    const testStages = await prisma.testStage.findMany({
      where: {
        testId: candidate.testId
      },
      include: {
        stage: true
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // Formatar as etapas para retorno
    const stages = testStages.map(ts => ({
      id: ts.stageId,
      order: ts.order,
      title: ts.stage.title,
      description: ts.stage.description
    }));
    
    return res.status(200).json({
      stages,
      testId: candidate.testId,
      totalStages: stages.length
    });
  } catch (error) {
    console.error('Erro ao buscar etapas do teste:', error);
    return res.status(500).json({ error: 'Erro ao buscar etapas do teste', stages: [] });
  } finally {
    await prisma.$disconnect();
  }
}
