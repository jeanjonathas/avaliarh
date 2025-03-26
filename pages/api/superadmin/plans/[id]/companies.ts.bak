import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/plans/${req.query.id}/companies`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do plano é obrigatório' });
    }

    try {
      // Verificar se o plano existe
      const plan = await prisma.plan.findUnique({
        where: { id },
      });

      if (!plan) {
        return res.status(404).json({ message: 'Plano não encontrado' });
      }

      // GET - Obter empresas de um plano específico
      if (req.method === 'GET') {
        const companies = await prisma.company.findMany({
          where: {
            planId: id,
          },
          include: {
            subscription: true,
          },
          orderBy: {
            name: 'asc',
          },
        });

        // Formatar a resposta
        const formattedCompanies = companies.map(company => ({
          id: company.id,
          name: company.name,
          plan: plan.name,
          planId: plan.id,
          isActive: company.isActive,
          subscriptionStatus: company.subscription?.status || 'PENDING',
          subscriptionEndDate: company.subscription?.endDate || null,
        }));

        return res.status(200).json(formattedCompanies);
      }

      // Método não permitido
      return res.status(405).json({ message: 'Método não permitido' });
    } catch (error) {
      console.error('Erro na API de empresas do plano:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Erro na API de empresas do plano:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
