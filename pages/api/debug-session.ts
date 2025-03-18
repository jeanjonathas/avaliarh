import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Obter a sessão do usuário
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Buscar informações completas do usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Retornar informações da sessão e do usuário
    return res.status(200).json({
      session,
      user,
      message: 'Esta é uma rota de depuração temporária para verificar a sessão do usuário'
    });
  } catch (error) {
    console.error('Erro ao depurar sessão:', error);
    return res.status(500).json({ error: 'Erro ao depurar sessão' });
  }
}
