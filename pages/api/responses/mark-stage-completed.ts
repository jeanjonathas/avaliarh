import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { stageId, candidateId } = req.body;
    
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
            error: 'Candidato não encontrado ou sem teste associado'
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
            error: 'Etapa não encontrada'
          });
        }
      } else {
        // Buscar pelo ID personalizado (não implementado ainda)
        return res.status(400).json({ 
          error: 'Formato de ID de etapa não suportado'
        });
      }
    }
    
    // Buscar todas as questões da etapa
    const stageQuestions = await prisma.stageQuestion.findMany({
      where: {
        stageId: stageUUID
      },
      include: {
        question: {
          include: {
            options: true
          }
        }
      }
    });
    
    // Para cada questão que ainda não tem resposta, criar uma resposta "automática"
    // com a primeira opção (isso é apenas para marcar como concluído)
    for (const sq of stageQuestions) {
      // Verificar se já existe uma resposta para esta questão
      const existingResponse = await prisma.response.findFirst({
        where: {
          candidateId,
          questionId: sq.questionId
        }
      });
      
      // Se não existir resposta e a questão tiver opções, criar uma resposta automática
      if (!existingResponse && sq.question.options.length > 0) {
        await prisma.response.create({
          data: {
            candidateId,
            questionId: sq.questionId,
            optionId: sq.question.options[0].id
          }
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Etapa marcada como concluída com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao marcar etapa como concluída:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor'
    });
  }
}
