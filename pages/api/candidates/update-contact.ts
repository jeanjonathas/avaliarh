import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { 
      candidateId, 
      name, 
      email, 
      phone, 
      position, 
      linkedin, 
      github, 
      portfolio 
    } = req.body;
    
    if (!candidateId) {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    // Verificar se o candidato existe
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    // Atualizar os dados do candidato
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        name: name || candidate.name,
        email: email || candidate.email,
        phone: phone || candidate.phone,
        position: position || candidate.position,
        linkedin: linkedin || candidate.linkedin,
        github: github || candidate.github,
        portfolio: portfolio || candidate.portfolio,
        updatedAt: new Date()
      }
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Dados de contato atualizados com sucesso',
      data: updatedCandidate
    });
  } catch (error) {
    console.error('Erro ao atualizar dados de contato:', error);
    return res.status(500).json({ error: 'Erro ao atualizar dados de contato' });
  } finally {
    await prisma.$disconnect();
  }
}
