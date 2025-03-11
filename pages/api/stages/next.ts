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
    const { currentStage, candidateId } = req.query;
    
    if (!currentStage || typeof currentStage !== 'string') {
      return res.status(400).json({ error: 'ID da etapa atual é obrigatório' });
    }
    
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
        hasNextStage: false
      });
    }
    
    // Verificar se o ID da etapa atual é um número (ordem) ou um UUID
    const isOrderNumber = /^\d+$/.test(currentStage);
    const currentStageOrder = isOrderNumber ? parseInt(currentStage) : null;
    
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
    
    // Log para diagnóstico
    console.log('Etapas do teste encontradas:', {
      testId: candidate.testId,
      stageCount: testStages.length,
      stages: testStages.map(ts => ({ 
        order: ts.order, 
        stageId: ts.stageId,
        title: ts.stage.title
      }))
    });
    
    // Encontrar a etapa atual e a próxima
    let currentStageIndex: number;
    
    if (isOrderNumber && currentStageOrder) {
      // Se o ID da etapa é um número (ordem), encontrar pelo número da ordem
      currentStageIndex = testStages.findIndex(ts => ts.order === currentStageOrder);
    } else {
      // Se o ID da etapa é um UUID, encontrar pelo ID da etapa
      currentStageIndex = testStages.findIndex(ts => ts.stageId === currentStage);
    }
    
    // Se não encontramos a etapa atual, retornar status 200 com hasNextStage: false
    // Isso evita que o cliente trate como um erro quando não há próxima etapa
    if (currentStageIndex === -1) {
      return res.status(200).json({ 
        message: 'Etapa atual não encontrada no teste',
        hasNextStage: false,
        totalStages: testStages.length
      });
    }
    
    // Verificar se há uma próxima etapa
    const hasNextStage = currentStageIndex < testStages.length - 1;
    
    if (hasNextStage) {
      const nextStage = testStages[currentStageIndex + 1];
      
      return res.status(200).json({
        hasNextStage: true,
        nextStageId: nextStage.order.toString(), // Usar a ordem como ID para a URL
        nextStageUuid: nextStage.stageId,
        currentStageIndex,
        totalStages: testStages.length
      });
    } else {
      return res.status(200).json({
        hasNextStage: false,
        currentStageIndex,
        totalStages: testStages.length
      });
    }
  } catch (error) {
    console.error('Erro ao buscar próxima etapa:', error);
    return res.status(500).json({ error: 'Erro ao buscar próxima etapa', hasNextStage: false });
  } finally {
    await prisma.$disconnect();
  }
}
