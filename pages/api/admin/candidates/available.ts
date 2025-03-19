import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação (o middleware já faz isso, mas mantemos para segurança adicional)
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  // Apenas permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    // Obter ID do processo da query
    const { processId } = req.query;
    
    if (!processId || typeof processId !== 'string') {
      return res.status(400).json({ error: 'ID do processo é obrigatório' });
    }
    
    // Obter o usuário atual e sua empresa
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
      select: { companyId: true }
    });
    
    if (!user?.companyId) {
      return res.status(403).json({ error: 'Usuário não está associado a uma empresa' });
    }
    
    // Verificar se o processo pertence à empresa do usuário
    const process = await prisma.selectionProcess.findUnique({
      where: { id: processId },
      select: { companyId: true }
    });
    
    if (!process) {
      return res.status(404).json({ error: 'Processo seletivo não encontrado' });
    }
    
    if (process.companyId !== user.companyId) {
      return res.status(403).json({ error: 'Acesso negado a este processo seletivo' });
    }
    
    // Buscar candidatos da empresa que NÃO estão associados ao processo atual
    const availableCandidates = await prisma.candidate.findMany({
      where: {
        companyId: user.companyId,
        // Não incluir candidatos que já estão no processo
        NOT: {
          processId: processId
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return res.status(200).json(availableCandidates);
    
  } catch (error) {
    console.error('Erro ao buscar candidatos disponíveis:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
