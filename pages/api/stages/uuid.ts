import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { stageId, candidateId } = req.query;

  if (!stageId || !candidateId) {
    return res.status(400).json({ error: 'stageId e candidateId são obrigatórios' });
  }

  try {
    console.log(`Buscando UUID para etapa com ID ${stageId} e candidato ${candidateId}`);

    // Primeiro, verificar se o ID já é um UUID válido
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId as string);
    
    if (isValidUUID) {
      console.log(`ID ${stageId} já é um UUID válido`);
      return res.status(200).json({ uuid: stageId });
    }

    // Buscar o candidato para obter o testId
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId as string },
      select: { testId: true }
    });

    if (!candidate || !candidate.testId) {
      console.error(`Candidato ${candidateId} não encontrado ou não tem testId associado`);
      return res.status(404).json({ error: 'Candidato não encontrado ou não tem teste associado' });
    }

    console.log(`Candidato ${candidateId} está associado ao teste ${candidate.testId}`);

    // Buscar todas as etapas do teste
    const testStages = await prisma.testStage.findMany({
      where: { testId: candidate.testId },
      include: { stage: true },
      orderBy: { order: 'asc' }
    });

    console.log(`Encontradas ${testStages.length} etapas para o teste ${candidate.testId}`);

    // Se o stageId for um número (como "1"), buscar a etapa com essa ordem
    if (/^\d+$/.test(stageId as string)) {
      const order = parseInt(stageId as string, 10) - 1; // Converter para base 0
      console.log(`Buscando etapa com ordem ${order}`);
      
      const stageWithOrder = testStages.find(ts => ts.order === order);
      
      if (stageWithOrder) {
        console.log(`Etapa com ordem ${order} encontrada: ${stageWithOrder.stageId}`);
        return res.status(200).json({ uuid: stageWithOrder.stageId });
      }
    }

    // Se o stageId for um ID personalizado (como "stage-logic-01"), buscar por correspondência parcial
    const customIdStage = testStages.find(ts => 
      ts.stage.id.includes(stageId as string) || 
      ts.stage.title.toLowerCase().includes((stageId as string).toLowerCase())
    );

    if (customIdStage) {
      console.log(`Etapa com ID personalizado ${stageId} encontrada: ${customIdStage.stageId}`);
      return res.status(200).json({ uuid: customIdStage.stageId });
    }

    // Se não encontrou correspondência, retornar erro
    console.error(`Nenhuma etapa encontrada para o ID ${stageId}`);
    return res.status(404).json({ error: 'Etapa não encontrada' });
  } catch (error) {
    console.error('Erro ao buscar UUID da etapa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
