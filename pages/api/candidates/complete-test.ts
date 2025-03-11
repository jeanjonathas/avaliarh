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
    
    // Atualizar o status do candidato para completed e APPROVED
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { 
        completed: true,
        status: 'APPROVED' // Atualizar o status para APPROVED
      }
    });
    
    console.log(`Candidato atualizado com sucesso: completed=${updatedCandidate.completed}, status=${updatedCandidate.status}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Teste marcado como concluído com sucesso',
      candidate: {
        id: updatedCandidate.id,
        completed: updatedCandidate.completed,
        status: updatedCandidate.status
      }
    });
  } catch (error) {
    console.error('Erro ao marcar teste como concluído:', error);
    return res.status(500).json({ error: 'Erro ao marcar teste como concluído' });
  } finally {
    await prisma.$disconnect();
  }
}
