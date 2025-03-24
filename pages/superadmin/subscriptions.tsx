import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useNotification } from '@/contexts/NotificationContext';
import { useRouter } from 'next/router';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';

// Tipos
interface Company {
  id: string;
  name: string;
  planId: string;
  planName: string;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
}

interface SubscriptionFormValues {
  status: string;
  startDate: string;
  endDate: string;
  lastPaymentDate: string;
  nextPaymentDate: string;
}

const SubscriptionStatusSchema = Yup.object().shape({
  status: Yup.string().required('Status é obrigatório'),
  startDate: Yup.date().nullable(),
  endDate: Yup.date().nullable(),
  lastPaymentDate: Yup.date().nullable(),
  nextPaymentDate: Yup.date().nullable(),
});

export default function Subscriptions() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const notification = useNotification();
  const router = useRouter();

  // Buscar empresas
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/superadmin/companies');
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        } else {
          notification.showToast('Erro ao carregar empresas', 'error');
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        notification.showToast('Erro ao carregar empresas', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [notification]);

  // Buscar detalhes da assinatura de uma empresa
  const fetchSubscriptionDetails = async (companyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/companies/${companyId}/subscription`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionDetails(data);
        
        // Encontrar e selecionar a empresa
        const company = companies.find(c => c.id === companyId);
        if (company) {
          setSelectedCompany(company);
        }
        
        setIsModalOpen(true);
      } else {
        notification.showToast('Erro ao carregar detalhes da assinatura', 'error');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da assinatura:', error);
      notification.showToast('Erro ao carregar detalhes da assinatura', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar status da assinatura
  const handleUpdateSubscription = async (values: SubscriptionFormValues) => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/companies/${selectedCompany.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const updatedCompany = await response.json();
        
        // Atualizar a lista de empresas
        setCompanies(companies.map(company => 
          company.id === updatedCompany.id ? {
            ...company,
            isActive: updatedCompany.isActive,
            subscriptionStatus: updatedCompany.subscriptionStatus,
            subscriptionEndDate: updatedCompany.subscriptionEndDate,
          } : company
        ));
        
        notification.showToast('Assinatura atualizada com sucesso', 'success');
        setIsModalOpen(false);
      } else {
        const error = await response.json();
        notification.showToast(error.message || 'Erro ao atualizar assinatura', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      notification.showToast('Erro ao atualizar assinatura', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Formatar data para exibição
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Formatar data para input
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Obter classe de cor com base no status
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6">Gerenciamento de Assinaturas</h1>
        
        {loading && (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        )}
        
        {!loading && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plano
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ativo
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhuma empresa encontrada
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <tr key={company.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{company.planName || 'Sem plano'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(company.subscriptionStatus)}`}>
                            {company.subscriptionStatus === 'ACTIVE' ? 'Ativa' : 
                             company.subscriptionStatus === 'PENDING' ? 'Pendente' : 
                             company.subscriptionStatus === 'EXPIRED' ? 'Expirada' : 
                             company.subscriptionStatus === 'CANCELLED' ? 'Cancelada' : 'Desconhecido'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {company.subscriptionEndDate ? formatDate(company.subscriptionEndDate) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {company.isActive ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => fetchSubscriptionDetails(company.id)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Gerenciar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Modal de Edição de Assinatura */}
        {isModalOpen && selectedCompany && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Gerenciar Assinatura - {selectedCompany.name}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="font-medium">{selectedCompany.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Plano</p>
                    <p className="font-medium">{selectedCompany.planName || 'Sem plano'}</p>
                  </div>
                </div>
              </div>
              
              <Formik
                initialValues={{
                  status: subscriptionDetails?.status || 'PENDING',
                  startDate: formatDateForInput(subscriptionDetails?.startDate) || '',
                  endDate: formatDateForInput(subscriptionDetails?.endDate) || '',
                  lastPaymentDate: formatDateForInput(subscriptionDetails?.lastPaymentDate) || '',
                  nextPaymentDate: formatDateForInput(subscriptionDetails?.nextPaymentDate) || '',
                }}
                validationSchema={SubscriptionStatusSchema}
                onSubmit={handleUpdateSubscription}
              >
                {({ errors, touched, isSubmitting }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status da Assinatura
                      </label>
                      <Field
                        as="select"
                        id="status"
                        name="status"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="ACTIVE">Ativa</option>
                        <option value="PENDING">Pendente</option>
                        <option value="EXPIRED">Expirada</option>
                        <option value="CANCELLED">Cancelada</option>
                      </Field>
                      {errors.status && touched.status && (
                        <div className="text-red-500 text-sm mt-1">{String(errors.status)}</div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Início
                        </label>
                        <Field
                          type="date"
                          id="startDate"
                          name="startDate"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Término
                        </label>
                        <Field
                          type="date"
                          id="endDate"
                          name="endDate"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="lastPaymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Data do Último Pagamento
                        </label>
                        <Field
                          type="date"
                          id="lastPaymentDate"
                          name="lastPaymentDate"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="nextPaymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Data do Próximo Pagamento
                        </label>
                        <Field
                          type="date"
                          id="nextPaymentDate"
                          name="nextPaymentDate"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6 space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/superadmin/login',
        permanent: false,
      },
    };
  }

  // Verificar se o usuário é um super admin
  if ((session.user.role as string) !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/admin/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};
