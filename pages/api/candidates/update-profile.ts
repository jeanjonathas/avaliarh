import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { inviteCode, name, email, phone, birthDate, gender } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Código de convite é obrigatório' });
    }
    
    // Validar campos obrigatórios
    if (!name || !email || !phone || !birthDate || !gender) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    // Buscar o candidato pelo código de convite
    const candidate = await prisma.candidate.findFirst({
      where: { inviteCode }
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    // Atualizar os dados do candidato
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        name,
        email,
        phone,
        birthDate: new Date(birthDate),
        gender,
        requiresProfileCompletion: false, // Marcar que o perfil foi completado
        updatedAt: new Date()
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      candidate: {
        id: updatedCandidate.id,
        name: updatedCandidate.name,
        email: updatedCandidate.email
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil do candidato' });
  }
}
