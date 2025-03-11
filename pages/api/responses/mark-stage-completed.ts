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
    const stageQuestions = await prisma.stageQuestion.findMany({
      where: {
        stageId: stageUUID
      },
      include: {
        question: {
          include: {
            options: true,
            Category: true,
            Stage: true
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
        const selectedOption = sq.question.options[0];
        
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
              "isCorrectOption", 
              "allOptionsSnapshot", 
              "questionSnapshot", 
              "categoryName", 
              "stageName", 
              "stageId",
              "createdAt", 
              "updatedAt"
            ) VALUES (
              ${uuidv4()}, 
              ${candidateId}, 
              ${sq.questionId}, 
              ${selectedOption.id}, 
              ${sq.question.text}, 
              ${selectedOption.text}, 
              ${selectedOption.isCorrect}, 
              ${JSON.stringify(sq.question.options)}::jsonb, 
              ${JSON.stringify({
                id: sq.question.id,
                text: sq.question.text,
                categoryId: sq.question.categoryId,
                categoryName: sq.question.Category?.name || null,
                stageName: sq.question.Stage?.title || null,
                stageId: sq.question.Stage?.id || null
              })}::jsonb, 
              ${sq.question.Category?.name || null}, 
              ${sq.question.Stage?.title || null}, 
              ${sq.question.Stage?.id || null},
              NOW(), 
              NOW()
            )
          `;
          
          console.log(`Resposta automática criada para a questão ${sq.questionId}`);
        } catch (error) {
          console.error('Erro ao criar resposta automática:', error);
          // Fallback: tentar criar apenas com os campos básicos
          await prisma.response.create({
            data: {
              candidateId,
              questionId: sq.questionId,
              optionId: selectedOption.id,
              //@ts-ignore - Ignorar erros de tipagem, pois sabemos que estes campos existem no banco
              questionText: sq.question.text,
              optionText: selectedOption.text,
              isCorrectOption: selectedOption.isCorrect,
              stageName: sq.question.Stage?.title || null,
              stageId: sq.question.Stage?.id || null,
              categoryName: sq.question.Category?.name || null
            } as any
          });
        }
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
