import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    console.log(`Buscando candidato com ID: ${id}`);
    
    // Buscar o candidato pelo ID usando SQL raw para evitar problemas de tipo
    const candidates = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        email, 
        phone, 
        position, 
        completed, 
        status,
        "inviteExpires", 
        "inviteAttempts",
        "testId",
        observations,
        instagram,
        "photoUrl",
        "requestPhoto",
        "showResults",
        score,
        score as "accuracyRate"
      FROM "Candidate"
      WHERE id = ${id}
    `;
    
    const candidate = Array.isArray(candidates) && candidates.length > 0 ? candidates[0] : null;
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    // Buscar as respostas do candidato para contar o número de questões
    const responses = await prisma.response.findMany({
      where: { candidateId: id },
      select: {
        id: true,
        questionId: true,
        questionType: true,
        question: {
          select: {
            id: true,
            type: true
          }
        }
      }
    });
    
    // Separar as respostas por tipo de questão
    const multipleChoiceResponses = responses.filter(r => {
      // Verificar primeiro no questionType
      if (r.questionType) {
        return r.questionType === 'MULTIPLE_CHOICE';
      }
      // Por último, verificar na relação question
      return r.question?.type === 'MULTIPLE_CHOICE';
    });
    
    const opinionResponses = responses.filter(r => {
      // Verificar primeiro no questionType
      if (r.questionType) {
        return r.questionType === 'OPINION_MULTIPLE';
      }
      // Por último, verificar na relação question
      return r.question?.type === 'OPINION_MULTIPLE';
    });
    
    // Adicionar informações adicionais ao candidato
    const candidateWithDetails = {
      ...candidate,
      multipleChoiceQuestions: multipleChoiceResponses.length,
      opinionQuestions: opinionResponses.length
    };
    
    return res.status(200).json({ 
      success: true,
      candidate: candidateWithDetails
    });
  } catch (error) {
    console.error('Erro ao buscar candidato:', error);
    return res.status(500).json({ error: 'Erro ao buscar candidato' });
  } finally {
    await prisma.$disconnect();
  }
}
