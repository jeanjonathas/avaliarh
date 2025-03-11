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
    
    if (!isValidUUID) {
      return res.status(400).json({ 
        error: 'ID de etapa inválido. Todas as etapas agora usam apenas UUIDs padrão.',
        completed: false
      });
    }
    
    // Usar o UUID diretamente, pois não temos mais IDs personalizados
    const stageUUID = stageId;
    
    // Verificar se existem respostas para esta etapa usando SQL raw para contornar limitações do tipo
    const responseCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "Response" 
      WHERE "candidateId" = ${candidateId} 
      AND "stageId" = ${stageUUID}
    `;
    
    // Extrair o número de respostas do resultado
    const responseCount = Number(responseCountResult[0]?.count || 0);
    
    // Buscar o número total de questões nesta etapa
    const questionCount = await prisma.stageQuestion.count({
      where: {
        stageId: stageUUID
      }
    });
    
    // Se o número de respostas for igual ao número de questões, a etapa está completa
    const completed = responseCount > 0 && responseCount >= questionCount;
    
    return res.status(200).json({
      completed,
      responseCount,
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
