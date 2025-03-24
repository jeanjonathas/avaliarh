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
      select: { testId: true, processId: true }
    });
    
    if (!candidate) {
      return res.status(404).json({ 
        error: 'Candidato não encontrado',
        stages: []
      });
    }
    
    // Se o candidato não tem testId mas tem processId, buscar o teste associado ao processo
    if (!candidate.testId && candidate.processId) {
      console.log(`Candidato ${candidateId} não tem testId, mas tem processId ${candidate.processId}. Buscando teste associado...`);
      
      try {
        // Buscar o processo e suas etapas
        const process = await prisma.selectionProcess.findUnique({
          where: { id: candidate.processId },
          include: {
            stages: {
              include: {
                test: true
              }
            }
          }
        });
        
        if (process && process.stages.length > 0) {
          // Encontrar a primeira etapa que tem um teste associado
          const testStage = process.stages.find(stage => stage.testId);
          
          if (testStage && testStage.testId) {
            console.log(`Encontrado teste ${testStage.testId} associado ao processo ${candidate.processId}. Atualizando candidato...`);
            
            // Atualizar o candidato com o testId encontrado
            await prisma.candidate.update({
              where: { id: candidateId },
              data: { testId: testStage.testId }
            });
            
            // Atualizar o objeto do candidato em memória
            candidate.testId = testStage.testId;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar teste associado ao processo:', error);
      }
    }
    
    if (!candidate.testId) {
      return res.status(404).json({ 
        error: 'Candidato sem teste associado',
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
