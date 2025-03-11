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
    const { stageId, candidateId } = req.query;
    
    if (!stageId || typeof stageId !== 'string') {
      return res.status(400).json({ error: 'ID da etapa é obrigatório' });
    }
    
    if (!candidateId || typeof candidateId !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    // Verificar se o ID da etapa é um UUID válido
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId);
    let stageUUID = stageId;
    
    // Se não for um UUID válido, buscar o UUID correspondente
    if (!isValidUUID) {
      // Verificar se é um número (ordem)
      const isOrderNumber = /^\d+$/.test(stageId);
      
      if (isOrderNumber) {
        // Buscar o testId associado ao candidato
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { testId: true }
        });
        
        if (!candidate || !candidate.testId) {
          return res.status(404).json({ 
            error: 'Candidato não encontrado ou sem teste associado',
            completed: false
          });
        }
        
        // Buscar a etapa pelo número da ordem
        const testStage = await prisma.testStage.findFirst({
          where: {
            testId: candidate.testId,
            order: parseInt(stageId)
          },
          select: { stageId: true }
        });
        
        if (testStage) {
          stageUUID = testStage.stageId;
        } else {
          return res.status(404).json({ 
            error: 'Etapa não encontrada',
            completed: false
          });
        }
      } else {
        // Buscar pelo ID personalizado (não implementado ainda)
        return res.status(400).json({ 
          error: 'Formato de ID de etapa não suportado',
          completed: false
        });
      }
    }
    
    // Verificar se existem respostas para esta etapa
    const responses = await prisma.response.findMany({
      where: {
        candidateId,
        question: {
          stageQuestions: {
            some: {
              stage: {
                id: stageUUID
              }
            }
          }
        }
      }
    });
    
    // Buscar o número total de questões nesta etapa
    const questionCount = await prisma.stageQuestion.count({
      where: {
        stageId: stageUUID
      }
    });
    
    // Se o número de respostas for igual ao número de questões, a etapa está completa
    const completed = responses.length > 0 && responses.length >= questionCount;
    
    return res.status(200).json({
      completed,
      responseCount: responses.length,
      questionCount
    });
    
  } catch (error) {
    console.error('Erro ao verificar se a etapa foi concluída:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      completed: false
    });
  }
}
