import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import { useSession } from 'next-auth/react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { PrismaClient } from '@prisma/client';

// Definir interfaces localmente em vez de importar diretamente do Prisma
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserWithCompany extends User {
  company?: {
    id: string;
    name: string;
  };
}

interface UsersPageProps {
  initialUsers: UserWithCompany[];
  companies: {
    id: string;
    name: string;
  }[];
}

const UsersPage: React.FC<UsersPageProps> = ({ initialUsers, companies }) => {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserWithCompany[]>(initialUsers);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<UserWithCompany | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithCompany | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/users');
      if (!response.ok) {
        throw new Error('Falha ao carregar usuários');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar usuários. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleViewUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar detalhes do usuário');
      }
      const data = await response.json();
      setViewingUser(data);
    } catch (err) {
      setError('Erro ao carregar detalhes do usuário. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (user: UserWithCompany) => {
    setUserToDelete(user);
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    await deleteUser(userToDelete.id);
    setShowDeleteAlert(false);
    setUserToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteAlert(false);
    setUserToDelete(null);
  };

  const deleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir usuário');
      }

      // Atualiza a lista de usuários após a exclusão
      setUsers(users.filter(user => user.id !== userId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (userData: Partial<User>) => {
    setIsLoading(true);
    try {
      const url = selectedUser
        ? `/api/superadmin/users/${selectedUser.id}`
        : '/api/superadmin/users';
      
      const method = selectedUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`Falha ao ${selectedUser ? 'atualizar' : 'criar'} usuário`);
      }

      // Recarrega a lista de usuários após a criação/atualização
      await loadUsers();
      
      // Fecha o formulário
      setIsFormOpen(false);
      setSelectedUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erro ao ${selectedUser ? 'atualizar' : 'criar'} usuário. Por favor, tente novamente.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
  };

  const handleCloseDetails = () => {
    setViewingUser(null);
  };

  // Renderização condicional baseada no estado
  const renderContent = () => {
    if (viewingUser) {
      return (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Detalhes do Usuário</h2>
            <button
              onClick={handleCloseDetails}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{viewingUser.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{viewingUser.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Função</p>
              <p className="font-medium">
                {viewingUser.role === 'SUPER_ADMIN' && 'Super Administrador'}
                {viewingUser.role === 'COMPANY_ADMIN' && 'Administrador de Empresa'}
                {viewingUser.role === 'INSTRUCTOR' && 'Instrutor'}
                {viewingUser.role === 'STUDENT' && 'Estudante'}
                {viewingUser.role === 'USER' && 'Usuário'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Empresa</p>
              <p className="font-medium">{viewingUser.company?.name || 'Não vinculado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Criação</p>
              <p className="font-medium">{new Date(viewingUser.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      );
    }

    if (isFormOpen) {
      return (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              {selectedUser ? 'Editar Usuário' : 'Adicionar Usuário'}
            </h2>
            <button
              onClick={handleFormCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const userData = {
              name: formData.get('name') as string,
              email: formData.get('email') as string,
              role: formData.get('role') as string,
              companyId: formData.get('companyId') as string || null,
              password: formData.get('password') as string || undefined,
            };
            handleFormSubmit(userData);
          }}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={selectedUser?.name || ''}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  defaultValue={selectedUser?.email || ''}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {!selectedUser && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required={!selectedUser}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Função</label>
                <select
                  id="role"
                  name="role"
                  defaultValue={selectedUser?.role || 'USER'}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="SUPER_ADMIN">Super Administrador</option>
                  <option value="COMPANY_ADMIN">Administrador de Empresa</option>
                  <option value="INSTRUCTOR">Instrutor</option>
                  <option value="STUDENT">Estudante</option>
                  <option value="USER">Usuário</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">Empresa</label>
                <select
                  id="companyId"
                  name="companyId"
                  defaultValue={selectedUser?.companyId || ''}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleFormCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {selectedUser ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">Usuários</h2>
            <button
              onClick={handleAddUser}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Adicionar Usuário
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role === 'SUPER_ADMIN' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Super Admin
                          </span>
                        )}
                        {user.role === 'COMPANY_ADMIN' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Admin
                          </span>
                        )}
                        {user.role === 'INSTRUCTOR' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Instrutor
                          </span>
                        )}
                        {user.role === 'STUDENT' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Estudante
                          </span>
                        )}
                        {user.role === 'USER' && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Usuário
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.company?.name || 'Não vinculado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-600 hover:text-red-900"
                          disabled={user.role === 'SUPER_ADMIN' && users.filter(u => u.role === 'SUPER_ADMIN').length <= 1}
                          title={user.role === 'SUPER_ADMIN' && users.filter(u => u.role === 'SUPER_ADMIN').length <= 1 ? 
                            'Não é possível excluir o último Super Admin' : 'Excluir usuário'}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <SuperAdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Gerenciamento de Usuários</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
          {renderContent()}
        </div>
      </div>
      
      {/* Modal de confirmação de exclusão */}
      {showDeleteAlert && userToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar Exclusão</h3>
            <p className="text-sm text-gray-500 mb-4">
              Tem certeza que deseja excluir o usuário <strong>{userToDelete.name}</strong>?
              {userToDelete.role === 'COMPANY_ADMIN' && (
                <span className="block mt-2 text-amber-600">
                  Atenção: Este usuário é um administrador de empresa. A exclusão pode afetar o acesso à empresa.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user?.role as string) !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/superadmin/login',
        permanent: false,
      },
    };
  }

  const prisma = new PrismaClient();

  try {
    // Busca todos os usuários com informações da empresa
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Busca todas as empresas ativas para o formulário
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Serializa as datas para JSON
    const serializedUsers = users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return {
      props: {
        initialUsers: serializedUsers,
        companies,
      },
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      props: {
        initialUsers: [],
        companies: [],
      },
    };
  } finally {
    await prisma.$disconnect();
  }
};

export default UsersPage;
