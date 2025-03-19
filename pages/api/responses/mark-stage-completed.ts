import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

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
    const questions = await prisma.question.findMany({
      where: {
        stageId: stageUUID
      },
      include: {
        options: true,
        stage: true
      }
    });
    
    // Para cada questão que ainda não tem resposta, criar uma resposta "automática"
    // com a primeira opção (isso é apenas para marcar como concluído)
    for (const question of questions) {
      // Verificar se já existe uma resposta para esta questão
      const existingResponse = await prisma.response.findFirst({
        where: {
          candidateId,
          questionId: question.id
        }
      });
      
      // Se não existir resposta e a questão tiver opções, criar uma resposta automática
      if (!existingResponse && question.options.length > 0) {
        const selectedOption = question.options[0];
        
        try {
          // Usar o prisma.$queryRaw para contornar problemas de tipagem
          await prisma.$executeRaw`
            INSERT INTO "Response" (
              "id", 
              "candidateId", 
              "questionId", 
              "optionId", 
              "questionText", 
              "optionText", 
              "isCorrect", 
              "companyId",
              "createdAt", 
              "updatedAt"
            ) VALUES (
              ${uuidv4()}, 
              ${candidateId}, 
              ${question.id}, 
              ${selectedOption.id}, 
              ${question.text}, 
              ${selectedOption.text}, 
              ${selectedOption.isCorrect}, 
              ${question.companyId || null},
              NOW(), 
              NOW()
            )
          `;
          
          console.log(`Resposta automática criada para a questão ${question.id}`);
        } catch (error) {
          console.error('Erro ao criar resposta automática:', error);
          // Fallback: tentar criar apenas com os campos básicos
          await prisma.response.create({
            data: {
              candidateId,
              questionId: question.id,
              optionId: selectedOption.id,
              //@ts-ignore - Ignorar erros de tipagem, pois sabemos que estes campos existem no banco
              questionText: question.text,
              optionText: selectedOption.text,
              isCorrect: selectedOption.isCorrect,
              companyId: question.companyId || null
            } as any
          });
        }
      }
    }
    
    // Registrar o progresso do candidato para esta etapa
    try {
      // Buscar o candidato para obter o companyId
      const candidateDetails = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { companyId: true }
      });
      
      if (!candidateDetails?.companyId) {
        console.error(`Não foi possível encontrar o companyId para o candidato ${candidateId}`);
        return res.status(404).json({ 
          error: 'Candidato não encontrado ou sem companyId'
        });
      }
      
      // Verificar se já existe um registro de progresso para esta etapa
      const existingProgress = await prisma.candidateProgress.findFirst({
        where: {
          candidateId,
          stageId: stageUUID
        }
      });
      
      if (!existingProgress) {
        // Criar um novo registro de progresso
        await prisma.candidateProgress.create({
          data: {
            candidateId,
            stageId: stageUUID,
            status: 'COMPLETED',
            completed: true,
            completedAt: new Date(),
            companyId: candidateDetails.companyId
          } as any
        });
        console.log(`Progresso registrado para o candidato ${candidateId} na etapa ${stageUUID}`);
      } else {
        // Atualizar o registro existente
        await prisma.candidateProgress.update({
          where: { id: existingProgress.id },
          data: {
            status: 'COMPLETED',
            completed: true,
            completedAt: new Date(),
            updatedAt: new Date()
          } as any
        });
        console.log(`Progresso atualizado para o candidato ${candidateId} na etapa ${stageUUID}`);
      }
    } catch (progressError) {
      console.error('Erro ao registrar progresso:', progressError);
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
