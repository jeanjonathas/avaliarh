import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

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
    const { name, email, phone, position, linkedin, github, portfolio, resumeUrl } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }
    
    // Criar o candidato sem código de convite
    // O código de convite será gerado posteriormente quando o usuário solicitar
    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone: phone || null,
        position: position || null,
        status: 'PENDING',
        completed: false,
        inviteAttempts: 0,
        inviteSent: false,
        linkedin: linkedin || null,
        github: github || null,
        portfolio: portfolio || null,
        resumeUrl: resumeUrl || null,
      },
    });
    
    return res.status(201).json(candidate);
  } catch (error) {
    console.error('Erro ao criar candidato:', error);
    return res.status(500).json({ error: 'Erro ao criar candidato' });
  } finally {
    await prisma.$disconnect();
  }
}
