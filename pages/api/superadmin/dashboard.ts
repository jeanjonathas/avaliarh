import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || session.user.role !== 'SUPER_ADMIN') {
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
      by: ['plan'],
      _count: {
        plan: true,
      },
    });

    const planStats: Record<string, number> = {};
    companiesByPlan.forEach(item => {
      planStats[item.plan] = item._count.plan;
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
}
