import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, DocumentIcon, DocumentTextIcon, DocumentDownloadIcon, XCircleIcon, ArrowDownTrayIcon, LinkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'link' | 'other';
  url: string;
  moduleId: string;
  lessonId: string | null;
  createdAt: string;
  updatedAt: string;
  module: {
    name: string;
  };
  lesson: {
    name: string;
  } | null;
}

interface Module {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  name: string;
  moduleId: string;
}

const MaterialsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    type: 'pdf',
    url: '',
    moduleId: '',
    lessonId: '',
  });
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);

  // Buscar materiais, módulos e aulas
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todos os módulos
      axios.get('/api/admin/training/modules')
        .then(response => {
          const modulesData = Array.isArray(response.data) ? response.data : [];
          setModules(modulesData);
        })
        .catch(err => {
          console.error('Erro ao buscar módulos:', err);
          setError('Ocorreu um erro ao buscar os módulos.');
        });
      
      // Buscar todas as aulas
      axios.get('/api/admin/training/lessons')
        .then(response => {
          const lessonsData = Array.isArray(response.data) ? response.data : [];
          setLessons(lessonsData);
        })
        .catch(err => {
          console.error('Erro ao buscar aulas:', err);
          setError('Ocorreu um erro ao buscar as aulas.');
        });
      
      // Buscar todos os materiais
      axios.get('/api/admin/training/materials')
        .then(response => {
          const materialsData = Array.isArray(response.data) ? response.data : [];
          setMaterials(materialsData);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar materiais:', err);
          setError('Ocorreu um erro ao buscar os materiais.');
          setLoading(false);
        });
    }
  }, [status, router]);

  // Filtrar aulas quando o módulo selecionado mudar
  useEffect(() => {
    if (selectedModuleId) {
      const filtered = lessons.filter(lesson => lesson.moduleId === selectedModuleId);
      setFilteredLessons(filtered);
      
      // Resetar a aula selecionada se não estiver no módulo atual
      if (selectedLessonId) {
        const lessonExists = filtered.some(lesson => lesson.id === selectedLessonId);
        if (!lessonExists) {
          setSelectedLessonId('');
        }
      }
    } else {
      setFilteredLessons(lessons);
    }
  }, [selectedModuleId, lessons, selectedLessonId]);

  // Atualizar aulas filtradas quando o novo material tiver um módulo selecionado
  useEffect(() => {
    if (newMaterial.moduleId) {
      const filtered = lessons.filter(lesson => lesson.moduleId === newMaterial.moduleId);
      setFilteredLessons(filtered);
    }
  }, [newMaterial.moduleId, lessons]);

  // Filtrar materiais com base nos critérios selecionados
  const filteredMaterials = materials.filter(material => {
    const matchesModule = selectedModuleId ? material.moduleId === selectedModuleId : true;
    const matchesLesson = selectedLessonId ? material.lessonId === selectedLessonId : true;
    const matchesType = selectedType ? material.type === selectedType : true;
    const matchesSearch = searchTerm 
      ? material.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        material.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return matchesModule && matchesLesson && matchesType && matchesSearch;
  });

  // Função para adicionar novo material
  const handleAddMaterial = () => {
    if (!newMaterial.title || !newMaterial.moduleId || !newMaterial.url) {
      setError('Por favor, preencha os campos obrigatórios: título, módulo e URL.');
      return;
    }
    
    setLoading(true);
    axios.post('/api/admin/training/materials', newMaterial)
      .then(response => {
        // Adicionar o novo material à lista
        setMaterials([...materials, response.data]);
        setShowAddModal(false);
        setNewMaterial({
          title: '',
          description: '',
          type: 'pdf',
          url: '',
          moduleId: '',
          lessonId: '',
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao adicionar material:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao adicionar o material.');
        setLoading(false);
      });
  };

  // Função para excluir material
  const handleDeleteMaterial = (materialId: string) => {
    if (confirm('Tem certeza que deseja excluir este material?')) {
      setLoading(true);
      axios.delete(`/api/admin/training/materials/${materialId}`)
        .then(() => {
          // Remover o material da lista
          setMaterials(materials.filter(material => material.id !== materialId));
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao excluir material:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao excluir o material.');
          setLoading(false);
        });
    }
  };

  // Função para obter o ícone do tipo de material
  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
      case 'video':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'link':
        return <LinkIcon className="h-5 w-5 text-green-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-secondary-500" />;
    }
  };

  // Função para obter o texto do tipo de material
  const getMaterialTypeText = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'video':
        return 'Vídeo';
      case 'link':
        return 'Link';
      default:
        return 'Outro';
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout activeSection="treinamento">
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-600">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <AdminLayout activeSection="treinamento">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        <ContextualNavigation 
          prevLink={contextualNav.prev} 
          nextLink={contextualNav.next} 
          relatedLinks={contextualNav.related} 
        />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Materiais</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Novo Material
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por texto */}
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-secondary-700 mb-2">
                Buscar:
              </label>
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Título ou descrição..."
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Filtro por módulo */}
            <div>
              <label htmlFor="moduleSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Módulo:
              </label>
              <select
                id="moduleSelect"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os módulos</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por aula */}
            <div>
              <label htmlFor="lessonSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Aula:
              </label>
              <select
                id="lessonSelect"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={!selectedModuleId}
              >
                <option value="">Todas as aulas</option>
                {filteredLessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por tipo */}
            <div>
              <label htmlFor="typeSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Tipo:
              </label>
              <select
                id="typeSelect"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os tipos</option>
                <option value="pdf">PDF</option>
                <option value="video">Vídeo</option>
                <option value="link">Link</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <DocumentIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum material encontrado</h2>
            <p className="text-secondary-500 mb-4">
              {materials.length === 0 
                ? 'Não há materiais cadastrados no sistema.' 
                : 'Nenhum material corresponde aos filtros selecionados.'}
            </p>
            <button
              onClick={() => {
                setSelectedModuleId('');
                setSelectedLessonId('');
                setSelectedType('');
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium mr-4"
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
            >
              Novo Material
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map(material => (
              <div 
                key={material.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      {getMaterialTypeIcon(material.type)}
                      <span className="ml-2 text-xs font-medium bg-secondary-100 text-secondary-800 px-2 py-0.5 rounded">
                        {getMaterialTypeText(material.type)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/admin/training/materials/${material.id}/edit`)}
                        className="text-secondary-500 hover:text-secondary-700"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMaterial(material.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-semibold text-secondary-800 mb-2">{material.title}</h2>
                  <p className="text-secondary-600 text-sm mb-4 line-clamp-2">{material.description}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-secondary-700 font-medium">Módulo:</span>
                      <span className="text-secondary-600 ml-2">{material.module.name}</span>
                    </div>
                    
                    {material.lesson && (
                      <div className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-secondary-700 font-medium">Aula:</span>
                        <span className="text-secondary-600 ml-2">{material.lesson.name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-secondary-700 font-medium">Adicionado em:</span>
                      <span className="text-secondary-600 ml-2">{formatDate(material.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-secondary-200">
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
                    >
                      {material.type === 'pdf' ? (
                        <>
                          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                          Download
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-5 w-5 mr-2" />
                          Acessar
                        </>
                      )}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Novo Material */}
      {showAddModal && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary-900">Novo Material</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-2">
                Título: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={newMaterial.title}
                onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-2">
                Descrição:
              </label>
              <textarea
                id="description"
                value={newMaterial.description}
                onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                rows={3}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="type" className="block text-sm font-medium text-secondary-700 mb-2">
                Tipo: <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                value={newMaterial.type}
                onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as any })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="pdf">PDF</option>
                <option value="video">Vídeo</option>
                <option value="link">Link</option>
                <option value="other">Outro</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="url" className="block text-sm font-medium text-secondary-700 mb-2">
                URL: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="url"
                value={newMaterial.url}
                onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                placeholder={newMaterial.type === 'pdf' ? 'URL do arquivo PDF' : newMaterial.type === 'video' ? 'URL do vídeo' : 'URL do link'}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="moduleId" className="block text-sm font-medium text-secondary-700 mb-2">
                Módulo: <span className="text-red-500">*</span>
              </label>
              <select
                id="moduleId"
                value={newMaterial.moduleId}
                onChange={(e) => setNewMaterial({ ...newMaterial, moduleId: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Selecione um módulo</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label htmlFor="lessonId" className="block text-sm font-medium text-secondary-700 mb-2">
                Aula:
              </label>
              <select
                id="lessonId"
                value={newMaterial.lessonId}
                onChange={(e) => setNewMaterial({ ...newMaterial, lessonId: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={!newMaterial.moduleId}
              >
                <option value="">Selecione uma aula (opcional)</option>
                {filteredLessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMaterial}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default MaterialsPage;
