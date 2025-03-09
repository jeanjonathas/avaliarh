import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { sendInviteEmail } from '../../../../lib/email';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o usuário está autenticado como administrador
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { candidateId } = req.body;
    
    if (!candidateId) {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }
    
    // Buscar o candidato com seu código de convite
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    if (!candidate.inviteCode || !candidate.inviteExpires) {
      return res.status(400).json({ error: 'Candidato não possui um código de convite válido' });
    }
    
    // Verificar se o código não está expirado
    if (new Date(candidate.inviteExpires) < new Date()) {
      return res.status(400).json({ error: 'O código de convite está expirado. Gere um novo código.' });
    }
    
    // Enviar e-mail com o código de convite
    const emailResult = await sendInviteEmail(
      candidate.email,
      candidate.name,
      candidate.inviteCode,
      candidate.inviteExpires
    );
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        error: 'Erro ao enviar e-mail', 
        details: emailResult.error 
      });
    }
    
    // Atualizar o status de envio do convite
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { inviteSent: true }
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Convite enviado com sucesso',
      emailPreviewUrl: emailResult.previewUrl,
    });
    
  } catch (error) {
    console.error('Erro ao enviar convite:', error);
    return res.status(500).json({ error: 'Erro ao enviar convite' });
  } finally {
    await prisma.$disconnect();
  }
}
