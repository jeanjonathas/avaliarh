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
    
    // Atualizar o status do candidato para completed
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "completed" = true,
          "completedAt" = ${new Date()}
      WHERE id = ${candidateId}
    `;
    
    return res.status(200).json({ 
      success: true, 
      message: 'Teste marcado como concluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao marcar teste como concluído:', error);
    return res.status(500).json({ error: 'Erro ao marcar teste como concluído' });
  } finally {
    await prisma.$disconnect();
  }
}
