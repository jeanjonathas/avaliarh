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
      console.log(`[DASHBOARD] Iniciando busca de estatísticas (${new Date().toISOString()})`);
      console.log(`[DASHBOARD] Session ID: ${session?.user?.id}, Role: ${session?.user?.role}`);

      // Busca estatísticas de empresas
      console.log(`[DASHBOARD] Buscando contagem total de empresas`);
      const totalCompanies = await prisma.company.count();
      console.log(`[DASHBOARD] Contagem total de empresas: ${totalCompanies}`);
      
      console.log(`[DASHBOARD] Buscando empresas ativas`);
      const activeCompanies = await prisma.company.count({
        where: { isActive: true },
      });
      console.log(`[DASHBOARD] Contagem de empresas ativas: ${activeCompanies}`);
      
      console.log(`[DASHBOARD] Buscando empresas inativas`);
      const inactiveCompanies = await prisma.company.count({
        where: { isActive: false },
      });
      console.log(`[DASHBOARD] Contagem de empresas inativas: ${inactiveCompanies}`);

      // Busca estatísticas de planos
      console.log(`[DASHBOARD] Buscando estatísticas de empresas por plano`);
      const companiesByPlan = await prisma.company.groupBy({
        by: ['planType'],
        _count: {
          planType: true,
        },
      });
      console.log(`[DASHBOARD] Estatísticas por plano:`, JSON.stringify(companiesByPlan));

      const planStats: Record<string, number> = {};
      companiesByPlan.forEach(item => {
        planStats[item.planType] = item._count.planType;
      });

      // Busca estatísticas de usuários
      console.log(`[DASHBOARD] Buscando total de usuários`);
      const totalUsers = await prisma.user.count();
      console.log(`[DASHBOARD] Total de usuários: ${totalUsers}`);
      
      // Busca estatísticas de usuários por role
      console.log(`[DASHBOARD] Buscando estatísticas de usuários por papel`);
      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      });
      console.log(`[DASHBOARD] Estatísticas por papel:`, JSON.stringify(usersByRole));

      const roleStats: Record<string, number> = {};
      usersByRole.forEach(item => {
        roleStats[item.role] = item._count.role;
      });

      // Busca estatísticas de candidatos
      console.log(`[DASHBOARD] Buscando total de candidatos`);
      const totalCandidates = await prisma.candidate.count();
      console.log(`[DASHBOARD] Total de candidatos: ${totalCandidates}`);
      
      console.log(`[DASHBOARD] Buscando candidatos com processo completo`);
      const completedCandidates = await prisma.candidate.count({
        where: { completed: true },
      });
      console.log(`[DASHBOARD] Candidatos com processo completo: ${completedCandidates}`);
      
      console.log(`[DASHBOARD] Buscando candidatos com processo pendente`);
      const pendingCandidates = await prisma.candidate.count({
        where: { completed: false },
      });
      console.log(`[DASHBOARD] Candidatos com processo pendente: ${pendingCandidates}`);

      // Busca estatísticas de testes
      console.log(`[DASHBOARD] Buscando total de testes`);
      const totalTests = await prisma.test.count();
      console.log(`[DASHBOARD] Total de testes: ${totalTests}`);

      // Busca estatísticas de processos seletivos
      console.log(`[DASHBOARD] Buscando total de processos seletivos`);
      const totalProcesses = await prisma.selectionProcess.count();
      console.log(`[DASHBOARD] Total de processos seletivos: ${totalProcesses}`);

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

      console.log(`[DASHBOARD] Estatísticas completas geradas com sucesso:`, JSON.stringify(stats));
      return res.status(200).json(stats);
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar estatísticas do dashboard:', error);
      
      // Verificar se é um erro de conexão com o banco
      if (error instanceof Error) {
        console.error(`[DASHBOARD] Tipo de erro: ${error.name}`);
        console.error(`[DASHBOARD] Mensagem de erro: ${error.message}`);
        
        // Verificar problemas de case sensitivity
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.error('[DASHBOARD] ERRO DE CASE SENSITIVITY DETECTADO!');
          console.error('[DASHBOARD] Detalhes do erro:', error.message);
        }
        
        // Verificar problemas de conexão
        if (error.message.includes('connect') || error.message.includes('connection')) {
          console.error('[DASHBOARD] ERRO DE CONEXÃO COM O BANCO DETECTADO!');
          console.error('[DASHBOARD] Verifique o pool de conexões e limite de conexões.');
        }
      }
      
      // Verificar estado do cliente Prisma
      try {
        const connectionInfo = await prisma.$executeRaw`SELECT 1 as connection_test`;
        console.log(`[DASHBOARD] Teste de conexão após erro: ${connectionInfo}`);
      } catch (connError) {
        console.error('[DASHBOARD] Erro no teste de conexão após o erro principal:', connError);
      }
      
      return res.status(500).json({ message: 'Erro ao buscar estatísticas do dashboard' });
    } finally {
      console.log(`[DASHBOARD] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
