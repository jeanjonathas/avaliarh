import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

// Número máximo de tentativas permitidas
const MAX_ATTEMPTS = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'Código de convite é obrigatório' });
    }
    
    // Buscar o candidato pelo código de convite usando SQL raw
    const candidates = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        email, 
        phone, 
        position, 
        completed, 
        "inviteExpires", 
        "inviteAttempts"
      FROM "Candidate"
      WHERE "inviteCode" = ${inviteCode}
    `;
    
    const candidate = Array.isArray(candidates) && candidates.length > 0 ? candidates[0] : null;
    
    // Se o candidato não for encontrado, retornar erro
    if (!candidate) {
      // Em um ambiente de produção, você poderia rastrear tentativas por IP
      // para evitar ataques de força bruta
      return res.status(404).json({ error: 'Código de convite inválido' });
    }
    
    // Incrementar o contador de tentativas
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "inviteAttempts" = "inviteAttempts" + 1
      WHERE id = ${candidate.id}
    `;
    
    // Verificar se o convite expirou
    if (candidate.inviteExpires && new Date() > new Date(candidate.inviteExpires)) {
      return res.status(400).json({ error: 'O código de convite expirou' });
    }
    
    // Verificar se excedeu o número máximo de tentativas
    if (candidate.inviteAttempts + 1 >= MAX_ATTEMPTS) {
      return res.status(400).json({ 
        error: 'Número máximo de tentativas excedido. Entre em contato com o administrador.'
      });
    }
    
    // Verificar se o candidato já completou o teste
    if (candidate.completed) {
      return res.status(400).json({ error: 'Este candidato já completou a avaliação' });
    }
    
    // Resetar o contador de tentativas após um login bem-sucedido
    await prisma.$executeRaw`
      UPDATE "Candidate"
      SET "inviteAttempts" = 0
      WHERE id = ${candidate.id}
    `;
    
    // Retornar os dados do candidato
    return res.status(200).json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        position: candidate.position || null
      }
    });
  } catch (error) {
    console.error('Erro ao validar convite:', error);
    return res.status(500).json({ error: 'Erro ao validar convite' });
  } finally {
    await prisma.$disconnect();
  }
}
