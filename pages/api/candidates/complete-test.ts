import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { candidateId } = req.body;
    
    if (!candidateId) {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    console.log(`Iniciando processo de conclusão do teste para o candidato ${candidateId}`);
    
    // Verificar se o candidato existe
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        email: true,
        completed: true,
        status: true
      }
    });
    
    if (!candidate) {
      console.error(`Candidato ${candidateId} não encontrado`);
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    console.log(`Candidato encontrado: ${candidate.name} (${candidate.email})`);
    console.log(`Status atual: completed=${candidate.completed}, status=${candidate.status}`);
    
    // Buscar as respostas do candidato
    const responses = await prisma.response.findMany({
      where: { candidateId },
      select: {
        id: true,
        questionId: true,
        questionText: true,
        optionText: true,
        isCorrect: true,
        categoryName: true,
        optionCharacteristic: true,
        questionType: true,
        questionSnapshot: true,
        allOptions: true,
        question: {
          select: {
            id: true,
            type: true
          }
        }
      }
    });
    
    console.log(`Candidato ${candidate.name} encontrado, processando ${responses.length} respostas`);
    
    // Separar as respostas por tipo de questão
    // Primeiro, verificar o tipo no snapshot, se disponível
    const multipleChoiceResponses = responses.filter(r => {
      // Verificar primeiro no snapshot
      if (r.questionSnapshot && typeof r.questionSnapshot === 'object' && (r.questionSnapshot as any).type) {
        return (r.questionSnapshot as any).type === 'MULTIPLE_CHOICE';
      }
      // Se não tiver no snapshot, verificar no questionType
      if (r.questionType) {
        return r.questionType === 'MULTIPLE_CHOICE';
      }
      // Por último, verificar na relação question
      return r.question?.type === 'MULTIPLE_CHOICE';
    });
    
    const opinionResponses = responses.filter(r => {
      // Verificar primeiro no snapshot
      if (r.questionSnapshot && typeof r.questionSnapshot === 'object' && (r.questionSnapshot as any).type) {
        return (r.questionSnapshot as any).type === 'OPINION_MULTIPLE';
      }
      // Se não tiver no snapshot, verificar no questionType
      if (r.questionType) {
        return r.questionType === 'OPINION_MULTIPLE';
      }
      // Por último, verificar na relação question
      return r.question?.type === 'OPINION_MULTIPLE';
    });
    
    console.log(`Respostas de múltipla escolha: ${multipleChoiceResponses.length}`);
    console.log(`Respostas opinativas: ${opinionResponses.length}`);
    
    // Calcular a taxa de acerto apenas para questões de múltipla escolha
    const totalMultipleChoiceQuestions = multipleChoiceResponses.length;
    const correctMultipleChoiceAnswers = multipleChoiceResponses.filter(r => r.isCorrect).length;
    const multipleChoiceAccuracyRate = totalMultipleChoiceQuestions > 0 
      ? (correctMultipleChoiceAnswers / totalMultipleChoiceQuestions) * 100 
      : 0;
    
    // Total de todas as questões (múltipla escolha + opinativas)
    const totalQuestions = responses.length;
    
    console.log(`Desempenho do candidato (múltipla escolha): ${correctMultipleChoiceAnswers}/${totalMultipleChoiceQuestions} (${multipleChoiceAccuracyRate.toFixed(1)}%)`);
    console.log(`Total de questões (todas): ${totalQuestions}`);
    
    // Atualizar o candidato como concluído
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        completed: true,
        status: 'APPROVED',
        score: multipleChoiceAccuracyRate, // Salvar a porcentagem de acertos em vez do número absoluto
        updatedAt: new Date()
      }
    });
    
    console.log(`Candidato atualizado com sucesso: completed=${updatedCandidate.completed}, status=${updatedCandidate.status}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Teste concluído com sucesso',
      candidate: {
        id: updatedCandidate.id,
        name: updatedCandidate.name,
        email: updatedCandidate.email,
        score: multipleChoiceAccuracyRate,
        multipleChoiceQuestions: totalMultipleChoiceQuestions,
        opinionQuestions: opinionResponses.length,
        accuracyRate: multipleChoiceAccuracyRate,
        completed: updatedCandidate.completed,
        status: updatedCandidate.status
      }
    });
  } catch (error) {
    console.error('Erro ao concluir teste:', error);
    return res.status(500).json({ error: 'Erro ao concluir teste' });
  } finally {
    await prisma.$disconnect();
  }
}
