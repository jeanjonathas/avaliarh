import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { toast } from 'react-toastify';

interface Category {
  id: string;
  name: string;
  description: string | null;
  questionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function GlobalCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para o formulário de nova categoria
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar categorias
  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/superadmin/globalcategories');
      
      if (!response.ok) {
        throw new Error('Falha ao carregar as categorias globais');
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError('Erro ao carregar as categorias globais');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Adicionar nova categoria
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/superadmin/globalcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar categoria global');
      }
      
      toast.success('Categoria global criada com sucesso');
      setNewCategory({ name: '', description: '' });
      fetchCategories();
    } catch (err) {
      toast.error('Erro ao criar categoria global');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atualizar categoria
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/superadmin/globalcategories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCategory.name,
          description: editingCategory.description,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar categoria global');
      }
      
      toast.success('Categoria global atualizada com sucesso');
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error('Erro ao atualizar categoria global');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir categoria
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria global?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/superadmin/globalcategories/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir categoria global');
      }
      
      toast.success('Categoria global excluída com sucesso');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir categoria global');
      console.error(err);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Categorias Globais</h1>
        
        {/* Formulário para adicionar nova categoria */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingCategory ? 'Editar Categoria Global' : 'Adicionar Nova Categoria Global'}
          </h2>
          
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingCategory ? editingCategory.name : newCategory.name}
                onChange={(e) => 
                  editingCategory 
                    ? setEditingCategory({...editingCategory, name: e.target.value})
                    : setNewCategory({...newCategory, name: e.target.value})
                }
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingCategory ? editingCategory.description || '' : newCategory.description}
                onChange={(e) => 
                  editingCategory 
                    ? setEditingCategory({...editingCategory, description: e.target.value})
                    : setNewCategory({...newCategory, description: e.target.value})
                }
                rows={3}
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Adicionar'}
              </button>
              
              {editingCategory && (
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* Lista de categorias existentes */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Categorias Globais Existentes</h2>
          
          {loading ? (
            <p className="text-gray-500">Carregando categorias globais...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : categories.length === 0 ? (
            <p className="text-gray-500">Nenhuma categoria global encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questões
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {category.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{category.questionsCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(category.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={category.questionsCount > 0}
                          title={category.questionsCount > 0 ? 'Esta categoria está sendo usada em questões' : ''}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/superadmin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
