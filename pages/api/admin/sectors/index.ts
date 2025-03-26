import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';;
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Verificar se o usuário tem permissão de admin
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
    select: { role: true, companyId: true }
  });

  if (!user || (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    if (req.method === 'GET') {
      // Buscar todos os setores usando raw query para evitar problemas com o modelo
      const sectors = await prisma.$queryRaw`
        SELECT id, name, description, "companyId", "createdAt", "updatedAt"
        FROM "TrainingSector"
        WHERE "companyId" = ${user.companyId}
        ORDER BY name ASC
      `;
      
      return res.status(200).json(sectors);
    } else {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro ao processar requisição de setores:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
