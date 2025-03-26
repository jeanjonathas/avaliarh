import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/dashboard`);
    
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

    // Apenas permite método GET
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Método não permitido' });
    }

    try {
      // Busca estatísticas de empresas
      const totalCompanies = await prisma.company.count();
      const activeCompanies = await prisma.company.count({
        where: { isActive: true },
      });
      const inactiveCompanies = await prisma.company.count({
        where: { isActive: false },
      });

      // Busca estatísticas de planos
      const companiesByPlan = await prisma.company.groupBy({
        by: ['planType'],
        _count: {
          planType: true,
        },
      });

      const planStats: Record<string, number> = {};
      companiesByPlan.forEach(item => {
        planStats[item.planType] = item._count.planType;
      });

      // Busca estatísticas de usuários
      const totalUsers = await prisma.user.count();
      
      // Busca estatísticas de usuários por role
      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      });

      const roleStats: Record<string, number> = {};
      usersByRole.forEach(item => {
        roleStats[item.role] = item._count.role;
      });

      // Busca estatísticas de candidatos
      const totalCandidates = await prisma.candidate.count();
      const completedCandidates = await prisma.candidate.count({
        where: { completed: true },
      });
      const pendingCandidates = await prisma.candidate.count({
        where: { completed: false },
      });

      // Busca estatísticas de testes
      const totalTests = await prisma.test.count();

      // Busca estatísticas de processos seletivos
      const totalProcesses = await prisma.selectionProcess.count();

      const stats = {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          inactive: inactiveCompanies,
          byPlan: planStats,
        },
        users: {
          total: totalUsers,
          byRole: roleStats,
        },
        candidates: {
          total: totalCandidates,
          completed: completedCandidates,
          pending: pendingCandidates,
        },
        tests: {
          total: totalTests,
        },
        processes: {
          total: totalProcesses,
        },
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({ message: 'Erro ao buscar estatísticas do dashboard' });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
