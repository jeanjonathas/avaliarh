import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { registerCandidateProgress } from '../../../lib/utils/candidate-progress';

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
    
    if (!isValidUUID) {
      return res.status(400).json({ 
        error: 'ID de etapa inválido. Todas as etapas agora usam apenas UUIDs padrão.',
        completed: false
      });
    }
    
    // Usar o UUID diretamente, pois não temos mais IDs personalizados
    const stageUUID = stageId;
    
    // Buscar informações sobre a etapa para obter o nome
    let stageName = '';
    const stage = await prisma.stage.findUnique({
      where: { id: stageUUID },
      select: { title: true }
    });
    
    if (stage) {
      stageName = stage.title || '';
    }
    
    console.log(`Verificando conclusão da etapa ${stageUUID} (${stageName}) para o candidato ${candidateId}`);
    
    // Verificar se existe um registro de progresso para esta etapa
    const progress = await prisma.candidateProgress.findFirst({
      where: {
        candidateId,
        stageId: stageUUID
      }
    });

    // Se existir um registro de progresso e estiver marcado como concluído, retornar true
    if (progress && (progress.status === 'COMPLETED' || progress.completed)) {
      return res.status(200).json({
        completed: true,
        completedAt: progress.completedAt || progress.updatedAt,
        message: 'Etapa já foi concluída anteriormente'
      });
    }

    // Contar quantas questões existem na etapa
    const totalQuestions = await prisma.$queryRaw<[{count: BigInt}]>`
      SELECT COUNT(*) as count FROM "Question" WHERE "stageId" = ${stageUUID}
    `;
    
    const totalQuestionsCount = Number(totalQuestions[0]?.count || 0);
    
    if (totalQuestionsCount === 0) {
      return res.status(200).json({
        completed: false,
        message: 'Não há questões nesta etapa'
      });
    }

    // Contar quantas respostas o candidato já deu para questões desta etapa
    const answeredQuestions = await prisma.$queryRaw<[{count: BigInt}]>`
      SELECT COUNT(DISTINCT r."questionId") as count 
      FROM "Response" r
      JOIN "Question" q ON r."questionId" = q."id"
      WHERE r."candidateId" = ${candidateId}
      AND q."stageId" = ${stageUUID}
    `;
    
    const answeredCount = Number(answeredQuestions[0]?.count || 0);
    
    // Se o candidato respondeu todas as questões, a etapa está concluída
    const isCompleted = answeredCount >= totalQuestionsCount;
    
    // Se a etapa estiver concluída mas não houver registro no CandidateProgress,
    // criar o registro agora
    if (isCompleted && !progress) {
      // Usar a função utilitária para registrar o progresso do candidato
      const progressResult = await registerCandidateProgress(candidateId, stageUUID, stageName);
      
      if (!progressResult.success) {
        console.warn('Aviso ao registrar progresso:', progressResult.message);
        // Continuar mesmo com aviso para não bloquear o fluxo do candidato
      }
    }
    
    return res.status(200).json({
      completed: isCompleted,
      answeredQuestions: answeredCount,
      totalQuestions: totalQuestionsCount,
      message: isCompleted 
        ? 'Etapa concluída com sucesso' 
        : `Faltam ${totalQuestionsCount - answeredCount} questões para concluir a etapa`
    });
    
  } catch (error) {
    console.error('Erro ao verificar se a etapa foi concluída:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      completed: false
    });
  }
}
