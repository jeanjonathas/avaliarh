import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { PrismaClient } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const prisma = new PrismaClient();
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }

    // POST - Gerar novo código de convite
    if (req.method === 'POST') {
      const { testId, processId } = req.body;

      // Verificar se o candidato já possui um código de convite
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        select: { 
          inviteCode: true,
          testId: true,
          processId: true
        }
      });

      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      // Se o candidato já possui um código de convite, não permitir gerar um novo
      if (candidate.inviteCode) {
        return res.status(400).json({ 
          success: false,
          error: 'Este candidato já possui um código de convite' 
        });
      }

      // Validar se foi fornecido um teste ou processo
      if (!testId && !processId) {
        return res.status(400).json({ 
          success: false,
          error: 'É necessário fornecer um teste ou processo seletivo' 
        });
      }

      // Gerar novo código de convite
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteExpires = new Date();
      inviteExpires.setDate(inviteExpires.getDate() + 7); // Expira em 7 dias

      // Atualizar candidato com o novo código e associações
      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          inviteCode,
          inviteExpires,
          testId: testId || undefined,
          processId: processId || undefined,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        inviteCode: updatedCandidate.inviteCode,
        inviteExpires: updatedCandidate.inviteExpires,
      });
    }

    // Método não permitido
    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
