import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Tab } from '@headlessui/react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Importar os componentes de cada aba
import CompanySettings from '../../../components/admin/settings/CompanySettings';
import UserSettings from '../../../components/admin/settings/UserSettings';
import SubscriptionSettings from '../../../components/admin/settings/SubscriptionSettings';
import PermissionSettings from '../../../components/admin/settings/PermissionSettings';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Settings() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obter dados da empresa da sessão
        if (session?.user?.company) {
          setCompanyData(session.user.company);
        } else {
          setError('Não foi possível carregar os dados da empresa');
        }
        
        // Buscar usuários da empresa
        try {
          const usersResponse = await axios.get('/api/admin/users');
          setUsers(usersResponse.data);
        } catch (err) {
          console.error('Erro ao buscar usuários:', err);
          setUsers([]);
        }
        
        // Buscar dados da assinatura (se existir API)
        try {
          const subscriptionResponse = await axios.get('/api/admin/subscription');
          setSubscriptionData(subscriptionResponse.data);
        } catch (err) {
          console.error('Erro ao buscar dados da assinatura:', err);
          // Dados simulados caso a API não exista
          setSubscriptionData({
            planName: session?.user?.company?.planType || 'Plano Padrão',
            status: 'ACTIVE',
            startDate: '2025-01-01',
            endDate: '2026-01-01',
            lastPaymentDate: '2025-03-01',
          });
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Ocorreu um erro ao carregar os dados');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [session, status]);

  const handleCompanyUpdate = (updatedData) => {
    setCompanyData(updatedData);
    toast.success('Dados da empresa atualizados com sucesso');
  };

  const handleUsersUpdate = () => {
    // Recarregar a lista de usuários
    axios.get('/api/admin/users')
      .then(response => {
        setUsers(response.data);
        toast.success('Lista de usuários atualizada');
      })
      .catch(error => {
        console.error('Erro ao atualizar lista de usuários:', error);
        toast.error('Erro ao atualizar lista de usuários');
      });
  };

  const tabs = [
    { name: 'Empresa', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )},
    { name: 'Usuários', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { name: 'Assinatura', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )},
    { name: 'Permissões', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )},
  ];

  // Loading component
  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
      <p className="text-secondary-700 text-lg">Carregando configurações...</p>
    </div>
  );

  // Error component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-danger-50 text-danger-700 p-4 rounded-lg mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-5">
            <h1 className="text-2xl font-bold text-secondary-900 mb-6">Configurações</h1>
            
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : (
              <Tab.Group>
                <Tab.List className="flex border-b border-secondary-200">
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.name}
                      className={({ selected }) =>
                        classNames(
                          'flex items-center px-6 py-3 text-sm font-medium outline-none',
                          'border-b-2 -mb-px transition-colors duration-200',
                          selected
                            ? 'border-primary-600 text-primary-700'
                            : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                        )
                      }
                    >
                      {tab.icon}
                      {tab.name}
                    </Tab>
                  ))}
                </Tab.List>
                <Tab.Panels className="mt-6">
                  {/* Empresa Tab */}
                  <Tab.Panel className="focus:outline-none">
                    <CompanySettings 
                      companyData={companyData} 
                      onUpdate={handleCompanyUpdate}
                    />
                  </Tab.Panel>
                  
                  {/* Usuários Tab */}
                  <Tab.Panel className="focus:outline-none">
                    <UserSettings 
                      users={users} 
                      onUpdate={handleUsersUpdate}
                    />
                  </Tab.Panel>
                  
                  {/* Assinatura Tab */}
                  <Tab.Panel className="focus:outline-none">
                    <SubscriptionSettings 
                      subscriptionData={subscriptionData} 
                    />
                  </Tab.Panel>
                  
                  {/* Permissões Tab */}
                  <Tab.Panel className="focus:outline-none">
                    <PermissionSettings />
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
