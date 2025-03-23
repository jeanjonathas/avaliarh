import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Sector {
  id: string;
  name: string;
  description: string;
  courseCount: number;
  createdAt: string;
}

const SectorsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSector, setCurrentSector] = useState<Sector | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Buscar setores
  useEffect(() => {
    const fetchSectors = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/admin/training/sectors');
        
        // Transformar os dados para incluir a contagem de cursos
        const sectorsWithCounts = response.data.map((sector: any) => ({
          id: sector.id,
          name: sector.name,
          description: sector.description,
          courseCount: sector.courses?.length || 0,
          createdAt: sector.createdAt
        }));
        
        setSectors(sectorsWithCounts);
      } catch (error) {
        console.error('Erro ao buscar setores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSectors();
  }, []);

  // Funções para manipular o modal de adição
  const openAddModal = () => {
    setFormData({ name: '', description: '' });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  // Funções para manipular o modal de edição
  const openEditModal = (sector: Sector) => {
    setCurrentSector(sector);
    setFormData({
      name: sector.name,
      description: sector.description
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setCurrentSector(null);
  };

  // Função para lidar com mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Função para adicionar um setor
  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/api/admin/training/sectors', formData);
      
      // Adicionar o novo setor à lista
      setSectors(prev => [...prev, {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        courseCount: 0,
        createdAt: response.data.createdAt
      }]);
      
      closeAddModal();
    } catch (error) {
      console.error('Erro ao adicionar setor:', error);
    }
  };

  // Função para editar um setor
  const handleEditSector = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentSector) return;
    
    try {
      const response = await axios.put(`/api/admin/training/sectors/${currentSector.id}`, formData);
      
      // Atualizar o setor na lista
      setSectors(prev => prev.map(sector => 
        sector.id === currentSector.id 
          ? {
              ...sector,
              name: response.data.name,
              description: response.data.description
            }
          : sector
      ));
      
      closeEditModal();
    } catch (error) {
      console.error('Erro ao editar setor:', error);
    }
  };

  // Função para excluir um setor
  const handleDeleteSector = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este setor? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      await axios.delete(`/api/admin/training/sectors/${id}`);
      
      // Remover o setor da lista
      setSectors(prev => prev.filter(sector => sector.id !== id));
    } catch (error) {
      console.error('Erro ao excluir setor:', error);
    }
  };

  // Renderizar modais
  const renderAddModal = () => (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 ${showAddModal ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Adicionar Novo Setor</h2>
        
        <form onSubmit={handleAddSector}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">Nome</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">Descrição</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeAddModal}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderEditModal = () => (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 ${showEditModal ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Editar Setor</h2>
        
        <form onSubmit={handleEditSector}>
          <div className="mb-4">
            <label htmlFor="edit-name" className="block text-sm font-medium text-secondary-700 mb-1">Nome</label>
            <input
              type="text"
              id="edit-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="edit-description" className="block text-sm font-medium text-secondary-700 mb-1">Descrição</label>
            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <AdminLayout activeSection="treinamento">
      <div className="px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        <ContextualNavigation 
          prevLink={contextualNav.prev} 
          nextLink={contextualNav.next} 
          relatedLinks={contextualNav.related} 
        />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Setores</h1>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Novo Setor
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {sectors.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-secondary-600">Nenhum setor encontrado. Clique em &quot;Novo Setor&quot; para adicionar.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Cursos
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Data de Criação
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {sectors.map((sector) => (
                      <tr key={sector.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-secondary-900">{sector.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-secondary-600 line-clamp-2">{sector.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-secondary-600">{sector.courseCount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-secondary-600">
                            {new Date(sector.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(sector)}
                            className="text-primary-600 hover:text-primary-800 mr-3"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSector(sector.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      
      {renderAddModal()}
      {renderEditModal()}
    </AdminLayout>
  );
};

export default SectorsPage;
