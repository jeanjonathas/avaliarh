import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useState } from 'react';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';

// Definição de tipos para as estatísticas
interface DashboardStats {
  companies: {
    total: number;
    active: number;
    inactive: number;
    byPlan: Record<string, number>;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  candidates: {
    total: number;
    completed: number;
    pending: number;
  };
  tests: number;
  processes: number;
}

export default function SuperAdminDashboard({ stats }: { stats: DashboardStats }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Função para formatar números grandes
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Função para determinar a cor do card com base no nome
  const getCardColor = (name: string): string => {
    const colors: Record<string, string> = {
      'companies': 'bg-blue-500',
      'users': 'bg-purple-500',
      'candidates': 'bg-green-500',
      'tests': 'bg-yellow-500',
      'processes': 'bg-red-500',
    };
    return colors[name] || 'bg-gray-500';
  };

  // Calcular a distribuição de planos para o gráfico
  const planDistribution = Object.entries(stats.companies.byPlan).map(([plan, count]) => ({
    name: plan || 'Sem plano',
    value: count,
    percentage: Math.round((count / stats.companies.total) * 100),
  }));

  // Calcular a distribuição de roles para o gráfico
  const roleDistribution = Object.entries(stats.users.byRole).map(([role, count]) => ({
    name: role,
    value: count,
    percentage: Math.round((count / stats.users.total) * 100),
  }));

  return (
    <SuperAdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Dashboard SuperAdmin</h1>
        
        {/* Navegação de Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`${
                activeTab === 'companies'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Empresas
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Usuários
            </button>
          </nav>
        </div>

        {/* Conteúdo do Dashboard */}
        {activeTab === 'overview' && (
          <>
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
              {/* Card de Empresas */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Empresas</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-gray-900">{formatNumber(stats.companies.total)}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-green-600">{formatNumber(stats.companies.active)} ativas</span>
                    <span className="text-red-600">{formatNumber(stats.companies.inactive)} inativas</span>
                  </div>
                </div>
                <div className="bg-blue-50 px-6 py-2">
                  <Link href="/superadmin/companies" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Ver detalhes →
                  </Link>
                </div>
              </div>

              {/* Card de Usuários */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Usuários</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-gray-900">{formatNumber(stats.users.total)}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Por função: </span>
                    {Object.entries(stats.users.byRole).map(([role, count], index) => (
                      <span key={role} className="text-purple-600">
                        {role}: {count}
                        {index < Object.entries(stats.users.byRole).length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-purple-50 px-6 py-2">
                  <Link href="/superadmin/users" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                    Ver detalhes →
                  </Link>
                </div>
              </div>

              {/* Card de Candidatos */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Candidatos</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-gray-900">{formatNumber(stats.candidates.total)}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-green-600">{formatNumber(stats.candidates.completed)} completos</span>
                    <span className="text-yellow-600">{formatNumber(stats.candidates.pending)} pendentes</span>
                  </div>
                </div>
                <div className="bg-green-50 px-6 py-2">
                  <Link href="/superadmin/candidates" className="text-green-600 hover:text-green-800 text-sm font-medium">
                    Ver detalhes →
                  </Link>
                </div>
              </div>

              {/* Card de Testes */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Testes</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-gray-900">{formatNumber(stats.tests)}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Total de testes criados</span>
                  </div>
                </div>
                <div className="bg-yellow-50 px-6 py-2">
                  <Link href="/superadmin/tests" className="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                    Ver detalhes →
                  </Link>
                </div>
              </div>

              {/* Card de Processos Seletivos */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Processos Seletivos</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-gray-900">{formatNumber(stats.processes)}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Total de processos ativos</span>
                  </div>
                </div>
                <div className="bg-red-50 px-6 py-2">
                  <Link href="/superadmin/processes" className="text-red-600 hover:text-red-800 text-sm font-medium">
                    Ver detalhes →
                  </Link>
                </div>
              </div>
            </div>

            {/* Seção de Distribuição */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Distribuição de Planos */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Planos</h3>
                <div className="space-y-4">
                  {planDistribution.map((plan) => (
                    <div key={plan.name} className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-24">{plan.name}</span>
                      <div className="flex-1 mx-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${plan.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-16 text-right">
                        {plan.value} ({plan.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribuição de Funções */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Funções</h3>
                <div className="space-y-4">
                  {roleDistribution.map((role) => (
                    <div key={role.name} className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-32">{role.name}</span>
                      <div className="flex-1 mx-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-purple-600 h-2.5 rounded-full" 
                            style={{ width: `${role.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-16 text-right">
                        {role.value} ({role.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'companies' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Gerenciamento de Empresas</h2>
            <p className="text-gray-600 mb-4">
              Esta seção permite visualizar e gerenciar todas as empresas cadastradas no sistema.
            </p>
            <Link 
              href="/superadmin/companies" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Ir para Gerenciamento de Empresas
            </Link>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Gerenciamento de Usuários</h2>
            <p className="text-gray-600 mb-4">
              Esta seção permite visualizar e gerenciar todos os usuários do sistema.
            </p>
            <Link 
              href="/superadmin/users" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Ir para Gerenciamento de Usuários
            </Link>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  // Usamos type assertion para evitar o erro de tipagem
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/superadmin/login',
        permanent: false,
      },
    };
  }

  const prisma = new PrismaClient();
  
  try {
    // Busca estatísticas de empresas
    const totalCompanies = await prisma.$queryRaw`SELECT COUNT(*) FROM "Company"`.then(
      (result) => Number(result[0].count)
    );
    const activeCompanies = await prisma.$queryRaw`SELECT COUNT(*) FROM "Company" WHERE "isActive" = true`.then(
      (result) => Number(result[0].count)
    );
    const inactiveCompanies = await prisma.$queryRaw`SELECT COUNT(*) FROM "Company" WHERE "isActive" = false`.then(
      (result) => Number(result[0].count)
    );

    // Busca estatísticas de planos
    const companiesByPlan = await prisma.$queryRaw`
      SELECT "plan", COUNT(*) as count 
      FROM "Company" 
      GROUP BY "plan"
    `.then((results) => 
      Array.isArray(results) 
        ? results.map((row: any) => ({ 
            plan: row.plan, 
            count: Number(row.count) 
          }))
        : []
    );

    // Converte os resultados para o formato esperado
    const planStats = companiesByPlan.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.plan] = curr.count;
      return acc;
    }, {});

    // Busca estatísticas de usuários
    const totalUsers = await prisma.$queryRaw`SELECT COUNT(*) FROM "User"`.then(
      (result) => Number(result[0].count)
    );
    const adminUsers = await prisma.$queryRaw`SELECT COUNT(*) FROM "User" WHERE "role" = 'COMPANY_ADMIN'`.then(
      (result) => Number(result[0].count)
    );
    const instructorUsers = await prisma.$queryRaw`SELECT COUNT(*) FROM "User" WHERE "role" = 'INSTRUCTOR'`.then(
      (result) => Number(result[0].count)
    );
    const regularUsers = await prisma.$queryRaw`SELECT COUNT(*) FROM "User" WHERE "role" = 'USER'`.then(
      (result) => Number(result[0].count)
    );

    // Busca estatísticas de candidatos
    const totalCandidates = await prisma.$queryRaw`SELECT COUNT(*) FROM "Candidate"`.then(
      (result) => Number(result[0].count)
    );
    const completedCandidates = await prisma.$queryRaw`SELECT COUNT(*) FROM "Candidate" WHERE "completed" = true`.then(
      (result) => Number(result[0].count)
    );
    const pendingCandidates = await prisma.$queryRaw`SELECT COUNT(*) FROM "Candidate" WHERE "completed" = false`.then(
      (result) => Number(result[0].count)
    );

    // Busca estatísticas de testes
    const totalTests = await prisma.$queryRaw`SELECT COUNT(*) FROM "Test"`.then(
      (result) => Number(result[0].count)
    );

    // Busca estatísticas de processos seletivos
    const totalProcesses = await prisma.$queryRaw`SELECT COUNT(*) FROM "SelectionProcess"`.then(
      (result) => Number(result[0].count)
    );

    const stats: DashboardStats = {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        byPlan: planStats,
      },
      users: {
        total: totalUsers,
        byRole: {
          'COMPANY_ADMIN': adminUsers,
          'INSTRUCTOR': instructorUsers,
          'USER': regularUsers,
        },
      },
      candidates: {
        total: totalCandidates,
        completed: completedCandidates,
        pending: pendingCandidates,
      },
      tests: totalTests,
      processes: totalProcesses,
    };

    return {
      props: {
        stats,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      props: {
        stats: {
          companies: { total: 0, active: 0, inactive: 0, byPlan: {} },
          users: { total: 0, byRole: {} },
          candidates: { total: 0, completed: 0, pending: 0 },
          tests: 0,
          processes: 0,
        },
      },
    };
  } finally {
    await prisma.$disconnect();
  }
};
