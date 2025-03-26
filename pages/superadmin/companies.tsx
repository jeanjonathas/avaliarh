import React, { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import CompanyList from '../../components/superadmin/CompanyList';
import CompanyForm from '../../components/superadmin/CompanyForm';
import CompanyDetails from '../../components/superadmin/CompanyDetails';
import DeleteConfirmationAlerts from '../../components/superadmin/DeleteConfirmationAlerts';
import { PrismaClient } from '@prisma/client';

// Definir interfaces localmente em vez de importar diretamente do Prisma
interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  planType: string; 
  plan?: string; 
  isActive: boolean;
  maxUsers: number;
  maxCandidates: number;
  lastPaymentDate: Date | null;
  trialEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyWithRelations extends Company {
  _count?: {
    users: number;
    candidates: number;
    tests: number;
    processes: number;
  };
  userCount?: number;
  candidateCount?: number;
  testCount?: number;
  processCount?: number;
}

interface CompaniesPageProps {
  initialCompanies: CompanyWithRelations[];
}

const CompaniesPage: React.FC<CompaniesPageProps> = ({ initialCompanies }) => {
  const [companies, setCompanies] = useState<CompanyWithRelations[]>(initialCompanies);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<CompanyWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithRelations | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Função para carregar empresas
  const loadCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[FRONTEND] Iniciando carregamento de empresas');
      
      const response = await fetch('/api/superadmin/companies', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!response.ok) {
        throw new Error('Falha ao carregar empresas');
      }
      
      const data = await response.json();
      
      console.log(`[FRONTEND] Recebidas ${data.length} empresas da API`);
      
      // Verificar se há duplicatas
      const uniqueIds = new Set(data.map((company: CompanyWithRelations) => company.id));
      console.log(`[FRONTEND] Número de IDs únicos: ${uniqueIds.size}`);
      
      if (uniqueIds.size !== data.length) {
        console.warn('[FRONTEND] ALERTA: Foram recebidas empresas com IDs duplicados da API!');
        
        // Remover duplicatas
        const uniqueCompanies = Array.from(
          new Map(data.map((company: CompanyWithRelations) => [company.id, company])).values()
        );
        
        console.log(`[FRONTEND] Removidas ${data.length - uniqueCompanies.length} empresas duplicadas`);
        setCompanies(uniqueCompanies as CompanyWithRelations[]);
      } else {
        setCompanies(data);
      }
      
      console.log('[FRONTEND] Empresas carregadas com sucesso');
    } catch (error) {
      console.error('[FRONTEND] Erro ao carregar empresas:', error);
      setError('Erro ao carregar empresas. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleViewCompany = async (companyId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/companies/${companyId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Falha ao carregar detalhes da empresa');
      }
      const data = await response.json();
      setViewingCompany(data);
    } catch (err) {
      setError('Erro ao carregar detalhes da empresa. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (company: CompanyWithRelations) => {
    setCompanyToDelete(company);
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    
    await deleteCompany(companyToDelete.id);
    setShowDeleteAlert(false);
    setCompanyToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteAlert(false);
    setCompanyToDelete(null);
  };

  // Efeito para carregar empresas ao montar o componente
  useEffect(() => {
    // Limpar o cache do navegador antes de carregar as empresas
    console.log('[FRONTEND] Limpando cache antes de carregar empresas');
    
    // Verificar se há dados no cache
    const cachedData = localStorage.getItem('companiesCache');
    if (cachedData) {
      console.log('[FRONTEND] Removendo dados do cache');
      localStorage.removeItem('companiesCache');
    }
    
    loadCompanies();
  }, [loadCompanies]);

  // Função para desativar uma empresa
  const handleDeactivateCompany = async () => {
    if (!companyToDelete) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/companies/${companyToDelete.id}`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao desativar empresa');
      }

      // Atualiza a empresa na lista para mostrar como desativada
      setCompanies(companies.map(company => 
        company.id === companyToDelete.id 
          ? { ...company, isActive: false } 
          : company
      ));
      
      setError(null);
      setShowDeleteAlert(false);
      setCompanyToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar empresa. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCompany = async (companyId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/companies/${companyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir empresa');
      }

      // Atualiza a lista de empresas após a exclusão
      setCompanies(companies.filter(company => company.id !== companyId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir empresa. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (companyData: Partial<Company>) => {
    setIsLoading(true);
    try {
      const url = selectedCompany
        ? `/api/superadmin/companies/${selectedCompany.id}`
        : '/api/superadmin/companies';
      
      const method = selectedCompany ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Resposta do servidor:', response.status, errorData);
        throw new Error(`Falha ao ${selectedCompany ? 'atualizar' : 'criar'} empresa`);
      }

      // Obter a resposta da criação/atualização
      const newCompanyData = await response.json();
      
      // Atualizar a lista de empresas localmente sem fazer uma nova requisição
      if (selectedCompany) {
        // Atualização: substituir a empresa existente
        setCompanies(prevCompanies => 
          prevCompanies.map(company => 
            company.id === selectedCompany.id ? newCompanyData : company
          )
        );
      } else {
        // Criação: adicionar a nova empresa à lista
        setCompanies(prevCompanies => [...prevCompanies, newCompanyData]);
      }
      
      // Fecha o formulário
      setIsFormOpen(false);
      setSelectedCompany(null);
      setError(null);
    } catch (err) {
      setError(`Erro ao ${selectedCompany ? 'atualizar' : 'criar'} empresa. Por favor, tente novamente.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedCompany(null);
  };

  const handleCloseDetails = () => {
    setViewingCompany(null);
  };

  // Função para atualizar a lista de empresas (usada para remover duplicatas)
  const handleCompaniesUpdate = useCallback((updatedCompanies: CompanyWithRelations[]) => {
    console.log(`[FRONTEND] Atualizando lista de empresas após remoção de duplicatas. Nova quantidade: ${updatedCompanies.length}`);
    setCompanies(updatedCompanies);
  }, []);

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Empresas</h1>
          <button
            onClick={handleAddCompany}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Adicionar Empresa
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        )}

        {showDeleteAlert && companyToDelete && (
          <DeleteConfirmationAlerts
            companyName={companyToDelete.name}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            onDeactivate={handleDeactivateCompany}
          />
        )}

        {isFormOpen ? (
          <CompanyForm
            company={selectedCompany}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        ) : viewingCompany ? (
          <CompanyDetails
            company={viewingCompany}
            onClose={handleCloseDetails}
          />
        ) : (
          <CompanyList
            companies={companies}
            onEdit={handleEditCompany}
            onDelete={handleDeleteClick}
            onView={handleViewCompany}
            onCompaniesUpdate={handleCompaniesUpdate}
          />
        )}
      </div>
    </SuperAdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  // Busca as empresas do banco de dados
  const prisma = new PrismaClient();
  
  try {
    // Usando métodos nativos do Prisma em vez de $queryRaw
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
        planType: true,
        isActive: true,
        maxUsers: true,
        maxCandidates: true,
        lastPaymentDate: true,
        trialEndDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            candidates: true,
            questions: true, // Usamos questions como proxy para testes
            processes: true
          }
        }
      }
    });

    // Serializa as datas para JSON e mapeia os resultados
    const serializedCompanies = companies.map(company => ({
      ...company,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      lastPaymentDate: company.lastPaymentDate ? company.lastPaymentDate.toISOString() : null,
      trialEndDate: company.trialEndDate ? company.trialEndDate.toISOString() : null,
      // Mapear contagens para os nomes esperados pelo componente
      userCount: company._count.users,
      candidateCount: company._count.candidates,
      testCount: company._count.questions, // Usamos questions como proxy para testes
      processCount: company._count.processes
    }));

    return {
      props: {
        initialCompanies: serializedCompanies,
      },
    };
  } catch (error) {
    console.error('Error fetching companies:', error);
    return {
      props: {
        initialCompanies: [],
      },
    };
  } finally {
    await prisma.$disconnect();
  }
};

export default CompaniesPage;
