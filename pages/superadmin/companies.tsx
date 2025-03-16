import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { Company } from '@prisma/client';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import CompanyList from '../../components/superadmin/CompanyList';
import CompanyForm from '../../components/superadmin/CompanyForm';
import CompanyDetails from '../../components/superadmin/CompanyDetails';
import { PrismaClient } from '@prisma/client';

interface CompanyWithRelations extends Company {
  _count: {
    users: number;
    candidates: number;
    tests: number;
    processes: number;
  };
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

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/companies');
      if (!response.ok) {
        throw new Error('Falha ao carregar empresas');
      }
      const data = await response.json();
      setCompanies(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar empresas. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await fetch(`/api/superadmin/companies/${companyId}`);
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

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir empresa');
      }

      // Atualiza a lista de empresas após a exclusão
      setCompanies(companies.filter(company => company.id !== companyId));
      setError(null);
    } catch (err) {
      setError('Erro ao excluir empresa. Por favor, tente novamente.');
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
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        throw new Error(`Falha ao ${selectedCompany ? 'atualizar' : 'criar'} empresa`);
      }

      // Recarrega a lista de empresas após a criação/atualização
      await loadCompanies();
      
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
            onDelete={handleDeleteCompany}
            onView={handleViewCompany}
          />
        )}
      </div>
    </SuperAdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || session.user.role !== 'SUPER_ADMIN') {
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
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            users: true,
            candidates: true,
            tests: true,
            processes: true,
          },
        },
      },
    });

    // Serializa as datas para JSON
    const serializedCompanies = companies.map(company => ({
      ...company,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      lastPaymentDate: company.lastPaymentDate ? company.lastPaymentDate.toISOString() : null,
      trialEndDate: company.trialEndDate ? company.trialEndDate.toISOString() : null,
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
