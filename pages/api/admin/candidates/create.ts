import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const prisma = new PrismaClient();

// Função para gerar código de convite único de 4 dígitos
function generateInviteCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

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
    
    // Gerar código de convite único
    let inviteCode;
    let isUnique = false;
    
    while (!isUnique) {
      inviteCode = generateInviteCode();
      
      // Verificar se o código já existe
      const existingCandidate = await prisma.candidate.findUnique({
        where: { inviteCode },
      });
      
      if (!existingCandidate) {
        isUnique = true;
      }
    }
    
    // Definir data de expiração (7 dias a partir de agora)
    const inviteExpires = new Date();
    inviteExpires.setDate(inviteExpires.getDate() + 7);
    
    // Criar o candidato com o código de convite
    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone: phone || null,
        position: position || null,
        status: 'PENDING',
        completed: false,
        inviteCode,
        inviteExpires,
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
