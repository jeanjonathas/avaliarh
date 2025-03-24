import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { candidateId, stageId, responses, timeSpent } = req.body;
    
    if (!candidateId || !stageId || !responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Dados inválidos. Verifique se todos os campos obrigatórios foram fornecidos.' });
    }
    
    console.log(`Processando ${responses.length} respostas para o candidato ${candidateId} na etapa ${stageId}`);
    
    // Buscar o candidato para verificar a empresa
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { companyId: true }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    // Buscar a etapa para obter informações
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      select: { id: true, title: true }
    });
    
    if (!stage) {
      return res.status(404).json({ error: 'Etapa não encontrada' });
    }
    
    // Criar um array para armazenar as respostas processadas
    const processedResponses = [];
    
    // Processar cada resposta
    for (const response of responses) {
      const { questionId, optionId, timeSpent: questionTimeSpent } = response;
      
      if (!questionId || !optionId) {
        console.warn(`Resposta inválida ignorada: questionId=${questionId}, optionId=${optionId}`);
        continue;
      }
      
      // Buscar a questão com suas opções
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          options: true,
          stage: true,
          categories: true,
          emotionGroup: true
        }
      });
      
      if (!question) {
        console.warn(`Questão não encontrada: ${questionId}`);
        continue;
      }
      
      // Buscar a opção selecionada
      const selectedOption = question.options.find(opt => opt.id === optionId);
      
      if (!selectedOption) {
        console.warn(`Opção não encontrada: ${optionId} para questão ${questionId}`);
        continue;
      }
      
      // Verificar se a resposta está correta (apenas para questões de múltipla escolha)
      const isCorrect = question.type === 'MULTIPLE_CHOICE' ? selectedOption.isCorrect : false;
      
      // Criar snapshot da questão
      const questionSnapshot = {
        id: question.id,
        text: question.text,
        type: question.type,
        stageId: question.stageId,
        stageName: question.stage?.title,
        options: question.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          categoryName: opt.categoryName,
          categoryNameUuid: opt.categoryNameUuid,
          weight: opt.weight
        }))
      };
      
      // Criar snapshot de todas as opções
      const allOptionsSnapshot = question.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        categoryName: opt.categoryName,
        categoryNameUuid: opt.categoryNameUuid,
        weight: opt.weight
      }));
      
      // Salvar a resposta com os snapshots
      const savedResponse = await prisma.response.create({
        data: {
          candidateId,
          questionId,
          questionText: question.text,
          optionText: selectedOption.text,
          isCorrect,
          timeSpent: questionTimeSpent || 0,
          companyId: candidate.companyId,
          stageId: question.stageId,
          stageName: question.stage?.title,
          categoryName: selectedOption.categoryName,
          optionId: selectedOption.id,
          optionCharacteristic: selectedOption.categoryName,
          optionOriginalOrder: selectedOption.position,
          questionSnapshot,
          allOptions: allOptionsSnapshot,
          questionType: question.type
        }
      });
      
      processedResponses.push(savedResponse);
    }
    
    // Atualizar o tempo gasto pelo candidato
    if (timeSpent && typeof timeSpent === 'number') {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          timeSpent: {
            increment: timeSpent
          }
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `${processedResponses.length} respostas salvas com sucesso`,
      responses: processedResponses
    });
  } catch (error) {
    console.error('Erro ao processar respostas:', error);
    return res.status(500).json({ error: 'Erro interno ao processar respostas' });
  } finally {
    await prisma.$disconnect();
  }
}
