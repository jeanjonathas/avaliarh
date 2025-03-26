import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { registerCandidateProgress } from '../../../lib/utils/candidate-progress';

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
    let stageName = '';
    
    // Se não for um UUID válido, buscar o UUID correspondente
    if (!isValidUUID) {
      // Verificar se é um número (ordem)
      const isOrderNumber = /^\d+$/.test(stageId);
      
      if (isOrderNumber) {
        // Buscar o testId associado ao candidato
        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId },
          select: { testId: true, processId: true }
        });
        
        if (!candidate) {
          return res.status(404).json({ 
            error: 'Candidato não encontrado'
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
            error: 'Candidato sem teste associado'
          });
        }
        
        // Buscar a etapa pelo número da ordem
        const testStage = await prisma.testStage.findFirst({
          where: {
            testId: candidate.testId,
            order: parseInt(stageId)
          },
          include: {
            stage: {
              select: {
                id: true,
                title: true
              }
            }
          }
        });
        
        if (testStage) {
          stageUUID = testStage.stageId;
          stageName = testStage.stage?.title || '';
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
    } else {
      // Buscar a etapa pelo UUID
      const stage = await prisma.stage.findUnique({
        where: { id: stageUUID },
        select: { 
          id: true,
          title: true 
        }
      });
      
      if (stage) {
        stageName = stage.title || '';
      }
    }
    
    // Buscar todas as questões da etapa
    const questions = await prisma.question.findMany({
      where: {
        stageId: stageUUID
      },
      include: {
        options: true,
        stage: true
      }
    });
    
    // Verificar se todas as questões já foram respondidas
    for (const question of questions) {
      // Verificar se já existe uma resposta para esta questão
      const existingResponse = await prisma.response.findFirst({
        where: {
          candidateId,
          questionId: question.id
        }
      });
      
      // Se não existir resposta, registrar no log mas não criar resposta automática
      if (!existingResponse) {
        console.log(`Questão ${question.id} não foi respondida pelo candidato ${candidateId}`);
      }
    }
    
    // Usar a função utilitária para registrar o progresso do candidato
    const progressResult = await registerCandidateProgress(candidateId, stageUUID, stageName);
    
    if (!progressResult.success) {
      console.warn('Aviso ao registrar progresso:', progressResult.message);
      // Continuar mesmo com aviso para não bloquear o fluxo do candidato
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
