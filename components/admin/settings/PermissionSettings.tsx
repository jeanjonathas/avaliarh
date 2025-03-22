import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface Permission {
  id: string;
  name: string;
  description: string;
  roles: string[];
}

interface PermissionSettingsProps {
  permissions?: Permission[];
}

const PermissionSettings: React.FC<PermissionSettingsProps> = ({ permissions: initialPermissions }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPermissions && initialPermissions.length > 0) {
      setPermissions(initialPermissions);
      setEditedPermissions([...initialPermissions]);
      setIsLoading(false);
    } else {
      fetchPermissions();
    }
  }, [initialPermissions]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/permissions');
      setPermissions(response.data);
      setEditedPermissions([...response.data]);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      setError('Não foi possível carregar as permissões');
      // Usar permissões padrão em caso de erro
      const defaultPermissions: Permission[] = [
        {
          id: '1',
          name: 'user.create',
          description: 'Criar novos usuários',
          roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
        },
        {
          id: '2',
          name: 'user.edit',
          description: 'Editar usuários existentes',
          roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
        },
        {
          id: '3',
          name: 'user.delete',
          description: 'Excluir usuários',
          roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
        },
        {
          id: '4',
          name: 'candidate.create',
          description: 'Criar novos candidatos',
          roles: ['COMPANY_ADMIN', 'USER', 'INSTRUCTOR'],
        },
        {
          id: '5',
          name: 'candidate.edit',
          description: 'Editar candidatos existentes',
          roles: ['COMPANY_ADMIN', 'USER', 'INSTRUCTOR'],
        },
        {
          id: '6',
          name: 'test.create',
          description: 'Criar novos testes',
          roles: ['COMPANY_ADMIN', 'INSTRUCTOR'],
        },
        {
          id: '7',
          name: 'test.edit',
          description: 'Editar testes existentes',
          roles: ['COMPANY_ADMIN', 'INSTRUCTOR'],
        },
        {
          id: '8',
          name: 'report.view',
          description: 'Visualizar relatórios',
          roles: ['COMPANY_ADMIN', 'USER', 'INSTRUCTOR'],
        },
        {
          id: '9',
          name: 'settings.edit',
          description: 'Editar configurações da empresa',
          roles: ['COMPANY_ADMIN'],
        },
      ];
      setPermissions(defaultPermissions);
      setEditedPermissions([...defaultPermissions]);
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { id: 'COMPANY_ADMIN', name: 'Administrador' },
    { id: 'USER', name: 'Usuário' },
    { id: 'INSTRUCTOR', name: 'Instrutor' },
  ];

  const handleRoleToggle = (permissionId: string, roleId: string) => {
    setEditedPermissions(prevPermissions => {
      return prevPermissions.map(permission => {
        if (permission.id === permissionId) {
          const newRoles = permission.roles.includes(roleId)
            ? permission.roles.filter(r => r !== roleId)
            : [...permission.roles, roleId];
          
          return { ...permission, roles: newRoles };
        }
        return permission;
      });
    });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await axios.put('/api/admin/permissions', editedPermissions);
      
      setPermissions([...editedPermissions]);
      setIsEditing(false);
      toast.success('Permissões atualizadas com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast.error('Erro ao atualizar permissões');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedPermissions([...permissions]);
    setIsEditing(false);
  };

  // Agrupar permissões por categoria
  const groupedPermissions = permissions.reduce((groups, permission) => {
    const category = permission.name.split('.')[0];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Carregando permissões...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={fetchPermissions} 
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Permissões</h3>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Editar Permissões
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
          <div key={category} className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 capitalize">{category}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Permissão
                    </th>
                    {roles.map(role => (
                      <th
                        key={role.id}
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryPermissions.map(permission => {
                    const permissionToUse = isEditing
                      ? editedPermissions.find(p => p.id === permission.id) || permission
                      : permission;
                    
                    return (
                      <tr key={permission.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{permission.description}</div>
                          <div className="text-xs text-gray-500">{permission.name}</div>
                        </td>
                        {roles.map(role => (
                          <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                            {isEditing ? (
                              <input
                                type="checkbox"
                                checked={permissionToUse.roles.includes(role.id)}
                                onChange={() => handleRoleToggle(permission.id, role.id)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                            ) : (
                              <span>
                                {permissionToUse.roles.includes(role.id) ? (
                                  <svg className="h-5 w-5 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5 text-gray-300 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>
          <strong>Nota:</strong> As alterações nas permissões afetam todos os usuários com as funções correspondentes.
        </p>
      </div>
    </div>
  );
};

export default PermissionSettings;
