import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Tab } from '@headlessui/react';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    // Simulate loading data
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, these would be actual API calls
        // const companyResponse = await fetch('/api/admin/company');
        // const usersResponse = await fetch('/api/admin/users');
        // const subscriptionResponse = await fetch('/api/admin/subscription');
        
        // Simulating network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulated data for demonstration
        setCompanyData({
          name: 'AvaliaRH Company',
          cnpj: '12.345.678/0001-90',
          maxUsers: 10,
          maxCandidates: 100,
          isActive: true
        });
        
        setUsers([
          { id: '1', name: 'Admin User', email: 'admin@avaliarh.com', role: 'COMPANY_ADMIN' },
          { id: '2', name: 'Regular User', email: 'user@avaliarh.com', role: 'USER' },
          { id: '3', name: 'Instructor', email: 'instructor@avaliarh.com', role: 'INSTRUCTOR' }
        ]);
        
        setSubscriptionData({
          planName: 'Business Pro',
          status: 'ACTIVE',
          startDate: '2025-01-01',
          endDate: '2026-01-01',
          lastPaymentDate: '2025-03-01',
          nextPaymentDate: '2025-04-01',
          usedCandidates: 45,
          totalCandidates: 100,
          usedUsers: 3,
          totalUsers: 10
        });
      } catch (error) {
        console.error('Error fetching settings data:', error);
        setError('Não foi possível carregar as configurações. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
                    <CompanySettings companyData={companyData} />
                  </Tab.Panel>
                  
                  {/* Usuários Tab */}
                  <Tab.Panel className="focus:outline-none">
                    <UserSettings users={users} />
                  </Tab.Panel>
                  
                  {/* Assinatura Tab */}
                  <Tab.Panel className="focus:outline-none">
                    <SubscriptionSettings subscriptionData={subscriptionData} />
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

// Company Settings Component
function CompanySettings({ companyData }) {
  const [formData, setFormData] = useState(companyData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Update form data when companyData changes
  useEffect(() => {
    if (companyData) {
      setFormData(companyData);
    }
  }, [companyData]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real implementation: await fetch('/api/admin/company', { method: 'PUT', body: JSON.stringify(formData) });
      
      // Success notification
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving company data:', error);
      setSaveError('Não foi possível salvar as alterações. Por favor, tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-secondary-800 mb-4">Informações da Empresa</h2>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-success-50 text-success-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Informações salvas com sucesso!
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {saveError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
              Nome da Empresa
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData?.name || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              disabled={isSaving}
            />
          </div>
          
          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-secondary-700 mb-1">
              CNPJ
            </label>
            <input
              type="text"
              id="cnpj"
              name="cnpj"
              value={formData?.cnpj || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              disabled={isSaving}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isSaving 
                ? 'bg-primary-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </span>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// User Settings Component
function UserSettings({ users }) {
  const [userList, setUserList] = useState(users || []);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'USER'
  });
  
  // Update user list when users prop changes
  useEffect(() => {
    if (users) {
      setUserList(users);
    }
  }, [users]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real implementation: await fetch('/api/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
      
      // Add user to the list with a generated ID
      const generatedId = Date.now().toString();
      setUserList(prev => [...prev, { id: generatedId, ...newUser }]);
      
      // Reset form and close modal
      setNewUser({
        name: '',
        email: '',
        role: 'USER'
      });
      setIsAddingUser(false);
      
      // Show success message
      setSuccess('Usuário adicionado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding user:', error);
      setError('Não foi possível adicionar o usuário. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      // In a real implementation: await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      
      // Remove user from the list
      setUserList(prev => prev.filter(user => user.id !== userId));
      
      // Show success message
      setSuccess('Usuário removido com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Não foi possível remover o usuário. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const roleLabels = {
    'COMPANY_ADMIN': 'Administrador',
    'USER': 'Usuário',
    'INSTRUCTOR': 'Instrutor'
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-secondary-800">Gerenciar Usuários</h2>
        <button
          onClick={() => setIsAddingUser(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Adicionar Usuário
        </button>
      </div>
      
      {success && (
        <div className="mb-4 p-3 bg-success-50 text-success-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
          <p className="text-secondary-700">Processando...</p>
        </div>
      )}
      
      {userList.length === 0 ? (
        <div className="bg-secondary-50 rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-secondary-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-secondary-600 mb-4">Nenhum usuário encontrado.</p>
          <button
            onClick={() => setIsAddingUser(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Adicionar Usuário
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Função</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {userList.map((user) => (
                <tr key={user.id} className="hover:bg-secondary-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-600">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === 'COMPANY_ADMIN' ? 'bg-primary-100 text-primary-800' : 
                        user.role === 'INSTRUCTOR' ? 'bg-info-100 text-info-800' : 
                        'bg-secondary-100 text-secondary-800'}`}
                    >
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-danger-600 hover:text-danger-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || user.role === 'COMPANY_ADMIN'} // Prevent deleting admin users
                      title={user.role === 'COMPANY_ADMIN' ? 'Administradores não podem ser removidos' : 'Remover usuário'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-secondary-900">Adicionar Novo Usuário</h3>
              <button 
                onClick={() => setIsAddingUser(false)}
                className="text-secondary-500 hover:text-secondary-700"
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-secondary-700 mb-1">
                  Função
                </label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                >
                  <option value="USER">Usuário</option>
                  <option value="INSTRUCTOR">Instrutor</option>
                  <option value="COMPANY_ADMIN">Administrador</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                    isLoading 
                      ? 'bg-primary-400 cursor-not-allowed' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adicionando...
                    </span>
                  ) : (
                    'Adicionar Usuário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subscription Settings Component
function SubscriptionSettings({ subscriptionData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleUpdatePlan = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1200));
      // In a real implementation: await fetch('/api/admin/subscription/update', { method: 'POST' });
      
      setSuccess('Solicitação de atualização de plano enviada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      setError('Não foi possível processar sua solicitação. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!subscriptionData) {
    return (
      <div className="bg-secondary-50 rounded-lg p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-secondary-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p className="text-secondary-600 mb-4">Nenhuma informação de assinatura disponível.</p>
      </div>
    );
  }
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success-100 text-success-800';
      case 'PENDING':
        return 'bg-warning-100 text-warning-800';
      case 'EXPIRED':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativa';
      case 'PENDING':
        return 'Pendente';
      case 'EXPIRED':
        return 'Expirada';
      default:
        return status;
    }
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-secondary-800 mb-4">Detalhes da Assinatura</h2>
      
      {success && (
        <div className="mb-4 p-3 bg-success-50 text-success-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
          <p className="text-secondary-700">Processando...</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg border border-secondary-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-secondary-900">Plano Atual</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(subscriptionData.status)}`}>
            {getStatusLabel(subscriptionData.status)}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-secondary-500 mb-1">Nome do Plano</p>
            <p className="text-lg font-medium text-secondary-900">{subscriptionData.planName}</p>
          </div>
          
          <div>
            <p className="text-sm text-secondary-500 mb-1">Período</p>
            <p className="text-secondary-900">
              {new Date(subscriptionData.startDate).toLocaleDateString('pt-BR')} até {new Date(subscriptionData.endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-secondary-500 mb-1">Último Pagamento</p>
            <p className="text-secondary-900">{new Date(subscriptionData.lastPaymentDate).toLocaleDateString('pt-BR')}</p>
          </div>
          
          <div>
            <p className="text-sm text-secondary-500 mb-1">Próximo Pagamento</p>
            <p className="text-secondary-900">{new Date(subscriptionData.nextPaymentDate).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-secondary-200">
          <button
            onClick={handleUpdatePlan}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              isLoading 
                ? 'bg-primary-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </span>
            ) : (
              'Atualizar Plano'
            )}
          </button>
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-secondary-900 mb-4">Uso da Assinatura</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-secondary-900 font-medium">Candidatos</h4>
            <span className="text-sm text-secondary-500">{subscriptionData.usedCandidates} de {subscriptionData.totalCandidates}</span>
          </div>
          
          <div className="w-full bg-secondary-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full" 
              style={{ width: `${(subscriptionData.usedCandidates / subscriptionData.totalCandidates) * 100}%` }}
            ></div>
          </div>
          
          <p className="mt-2 text-sm text-secondary-500">
            {Math.round((subscriptionData.usedCandidates / subscriptionData.totalCandidates) * 100)}% utilizado
          </p>
        </div>
        
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-secondary-900 font-medium">Usuários</h4>
            <span className="text-sm text-secondary-500">{subscriptionData.usedUsers} de {subscriptionData.totalUsers}</span>
          </div>
          
          <div className="w-full bg-secondary-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full" 
              style={{ width: `${(subscriptionData.usedUsers / subscriptionData.totalUsers) * 100}%` }}
            ></div>
          </div>
          
          <p className="mt-2 text-sm text-secondary-500">
            {Math.round((subscriptionData.usedUsers / subscriptionData.totalUsers) * 100)}% utilizado
          </p>
        </div>
      </div>
    </div>
  );
}

// Permission Settings Component
function PermissionSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roles, setRoles] = useState([
    { id: 'COMPANY_ADMIN', name: 'Administrador' },
    { id: 'USER', name: 'Usuário' },
    { id: 'INSTRUCTOR', name: 'Instrutor' }
  ]);
  const [permissions, setPermissions] = useState([
    { id: 'manage_users', name: 'Gerenciar Usuários', description: 'Adicionar, editar e remover usuários', locked: false },
    { id: 'manage_candidates', name: 'Gerenciar Candidatos', description: 'Adicionar, editar e remover candidatos', locked: false },
    { id: 'manage_tests', name: 'Gerenciar Testes', description: 'Criar, editar e remover testes', locked: false },
    { id: 'manage_questions', name: 'Gerenciar Questões', description: 'Criar, editar e remover questões', locked: false },
    { id: 'view_reports', name: 'Visualizar Relatórios', description: 'Acessar relatórios e estatísticas', locked: false },
    { id: 'manage_subscription', name: 'Gerenciar Assinatura', description: 'Atualizar plano e gerenciar pagamentos', locked: true },
    { id: 'manage_company', name: 'Gerenciar Empresa', description: 'Editar informações da empresa', locked: true }
  ]);
  const [rolePermissions, setRolePermissions] = useState([]);
  
  useEffect(() => {
    const fetchPermissions = async () => {
      setIsFetching(true);
      setError(null);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1200));
        // In a real implementation: const response = await fetch('/api/admin/permissions');
        
        // Generate sample role permissions
        const sampleRolePermissions = roles.map((role, roleIndex) => {
          return {
            roleId: role.id,
            permissions: permissions.map(permission => ({
              permissionId: permission.id,
              granted: role.id === 'COMPANY_ADMIN' ? true : 
                      permission.locked ? false : 
                      Math.random() > 0.5
            }))
          };
        });
        
        setRolePermissions(sampleRolePermissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setError('Não foi possível carregar as permissões. Por favor, tente novamente.');
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchPermissions();
  }, []);
  
  const handleTogglePermission = (roleIndex, permissionId) => {
    // Create a deep copy of rolePermissions
    const updatedRolePermissions = JSON.parse(JSON.stringify(rolePermissions));
    
    // Find the permission and toggle it
    const permissionIndex = updatedRolePermissions[roleIndex].permissions.findIndex(
      p => p.permissionId === permissionId
    );
    
    if (permissionIndex !== -1) {
      updatedRolePermissions[roleIndex].permissions[permissionIndex].granted = 
        !updatedRolePermissions[roleIndex].permissions[permissionIndex].granted;
    }
    
    setRolePermissions(updatedRolePermissions);
  };
  
  const handleSavePermissions = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In a real implementation: await fetch('/api/admin/permissions', { method: 'PUT', body: JSON.stringify(rolePermissions) });
      
      setSuccess('Permissões salvas com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError('Não foi possível salvar as permissões. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Loading state
  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-secondary-700 text-lg">Carregando permissões...</p>
      </div>
    );
  }
  
  // Error state
  if (error && !rolePermissions.length) {
    return (
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
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-secondary-800">Gerenciar Permissões</h2>
        <button
          onClick={handleSavePermissions}
          className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
            isLoading 
              ? 'bg-primary-400 cursor-not-allowed' 
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </span>
          ) : (
            'Salvar Permissões'
          )}
        </button>
      </div>
      
      {success && (
        <div className="mb-4 p-3 bg-success-50 text-success-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Permissão</th>
              {roles.map(role => (
                <th key={role.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {permissions.map(permission => (
              <tr key={permission.id} className="hover:bg-secondary-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-secondary-900 flex items-center">
                      {permission.name}
                      {permission.locked && (
                        <span className="ml-2 text-secondary-400" title="Esta permissão não pode ser alterada">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-secondary-500">{permission.description}</div>
                  </div>
                </td>
                
                {rolePermissions.map((rolePermission, roleIndex) => {
                  const permissionItem = rolePermission.permissions.find(p => p.permissionId === permission.id);
                  const isAdmin = rolePermission.roleId === 'COMPANY_ADMIN';
                  const isDisabled = isLoading || permission.locked || isAdmin;
                  
                  return (
                    <td key={`${rolePermission.roleId}-${permission.id}`} className="px-6 py-4 whitespace-nowrap text-center">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className={`form-checkbox h-5 w-5 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 ${
                            isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          checked={permissionItem?.granted || false}
                          onChange={() => !isDisabled && handleTogglePermission(roleIndex, permission.id)}
                          disabled={isDisabled}
                        />
                        <span className="sr-only">{permission.name} para {roles[roleIndex].name}</span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 bg-secondary-50 p-4 rounded-md">
        <p className="text-sm text-secondary-600">
          <span className="font-medium">Nota:</span> Algumas permissões são fixas e não podem ser alteradas. O papel de Administrador tem todas as permissões por padrão.
        </p>
      </div>
    </div>
  );
}
