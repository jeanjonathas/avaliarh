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
    
    // Buscar as respostas do candidato com informações sobre o tipo de questão
    const responses = await prisma.response.findMany({
      where: { candidateId },
      select: {
        id: true,
        isCorrect: true,
        questionType: true,
        question: {
          select: {
            type: true
          }
        }
      }
    });
    
    console.log(`Candidato ${candidate.name} encontrado, processando ${responses.length} respostas`);
    
    // Filtrar apenas as questões de múltipla escolha (não opinativas)
    const multipleChoiceResponses = responses.filter(response => {
      // Verificar se não é uma questão opinativa baseado no tipo da questão
      // ou no questionType da resposta
      const isOpinion = 
        (response.question?.type === 'OPINION_MULTIPLE') || 
        (response.questionType === 'OPINION_MULTIPLE') ||
        (response.questionType === 'opinion');
      
      return !isOpinion;
    });
    
    console.log(`Respostas de múltipla escolha: ${multipleChoiceResponses.length} de ${responses.length} total`);
    
    // Calcular a taxa de acerto apenas para questões de múltipla escolha
    const totalMultipleChoiceQuestions = multipleChoiceResponses.length;
    const correctAnswers = multipleChoiceResponses.filter(r => r.isCorrect).length;
    const accuracyRate = totalMultipleChoiceQuestions > 0 ? (correctAnswers / totalMultipleChoiceQuestions) * 100 : 0;
    
    console.log(`Desempenho do candidato em questões de múltipla escolha: ${correctAnswers}/${totalMultipleChoiceQuestions} (${accuracyRate.toFixed(1)}%)`);
    
    // Atualizar o candidato como concluído
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        completed: true,
        status: 'APPROVED',
        score: correctAnswers,
        updatedAt: new Date()
      }
    });
    
    console.log(`Candidato atualizado com sucesso: completed=${updatedCandidate.completed}, status=${updatedCandidate.status}`);
    
    // Armazenar informações de pontuação em uma variável para retornar na resposta
    const scoreInfo = {
      score: correctAnswers,
      totalQuestions: totalMultipleChoiceQuestions,
      accuracyRate: accuracyRate
    };
    
    return res.status(200).json({ 
      success: true, 
      message: 'Teste concluído com sucesso',
      candidate: {
        id: updatedCandidate.id,
        name: updatedCandidate.name,
        email: updatedCandidate.email,
        score: correctAnswers,
        totalQuestions: totalMultipleChoiceQuestions,
        accuracyRate: accuracyRate,
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
