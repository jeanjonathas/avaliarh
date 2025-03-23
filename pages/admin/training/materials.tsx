import { NextPage } from 'next';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, DocumentIcon, DocumentTextIcon, ArrowDownTrayIcon, XCircleIcon, LinkIcon, PencilIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'link' | 'other';
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
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
  courseId: string;
}

interface Lesson {
  id: string;
  name: string;
  moduleId: string;
}

interface Course {
  id: string;
  name: string;
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
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
    filePath: '',
    fileName: '',
    fileSize: 0,
  });
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar cursos
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todos os cursos primeiro
      axios.get('/api/admin/training/courses')
        .then(response => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
          
          // Se houver um curso na URL, selecione-o
          const urlCourseId = router.query.courseId as string;
          if (urlCourseId) {
            setSelectedCourseId(urlCourseId);
          }
          
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError('Ocorreu um erro ao buscar os cursos.');
          setLoading(false);
        });
    }
  }, [status, router]);

  // Buscar módulos quando um curso for selecionado
  useEffect(() => {
    if (selectedCourseId) {
      setLoading(true);
      axios.get(`/api/admin/training/modules?courseId=${selectedCourseId}`)
        .then(response => {
          const modulesData = Array.isArray(response.data) ? response.data : [];
          setModules(modulesData);
          setSelectedModuleId('');
          setSelectedLessonId('');
          setLessons([]);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar módulos:', err);
          setError('Ocorreu um erro ao buscar os módulos.');
          setLoading(false);
        });
    }
  }, [selectedCourseId]);

  // Buscar lições quando um módulo for selecionado
  useEffect(() => {
    if (selectedModuleId) {
      setLoading(true);
      axios.get(`/api/admin/training/lessons?moduleId=${selectedModuleId}`)
        .then(response => {
          const lessonsData = Array.isArray(response.data) ? response.data : [];
          setLessons(lessonsData);
          setSelectedLessonId('');
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar aulas:', err);
          setError('Ocorreu um erro ao buscar as aulas.');
          setLoading(false);
        });
    }
  }, [selectedModuleId]);

  // Buscar materiais
  useEffect(() => {
    if (selectedModuleId) {
      setLoading(true);
      axios.get(`/api/admin/training/materials?moduleId=${selectedModuleId}`)
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
  }, [selectedModuleId]);

  // Filtrar lições quando o módulo mudar
  useEffect(() => {
    if (selectedModuleId) {
      const filtered = lessons.filter(lesson => lesson.moduleId === selectedModuleId);
      setFilteredLessons(filtered);
    } else {
      setFilteredLessons([]);
    }
  }, [selectedModuleId, lessons]);

  // Resetar o formulário de novo material
  const resetNewMaterialForm = () => {
    setNewMaterial({
      title: '',
      description: '',
      type: 'pdf',
      url: '',
      moduleId: selectedModuleId || '',
      lessonId: '',
      filePath: '',
      fileName: '',
      fileSize: 0,
    });
  };

  // Abrir modal para adicionar material
  const handleAddMaterial = () => {
    resetNewMaterialForm();
    setShowAddModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setShowAddModal(false);
  };

  // Atualizar campos do novo material
  const handleNewMaterialChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewMaterial(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Lidar com a seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) {
      setNewMaterial(prev => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
      }));
    } else {
      setNewMaterial(prev => ({
        ...prev,
        fileName: '',
        fileSize: 0,
        filePath: '',
      }));
    }
  };

  // Realizar upload do arquivo
  const handleFileUpload = async () => {
    if (!selectedFile) return null;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await axios.post('/api/admin/training/materials/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });
      
      setIsUploading(false);
      
      if (response.data.success) {
        setNewMaterial(prev => ({
          ...prev,
          filePath: response.data.file.filePath,
          fileName: response.data.file.fileName,
          fileSize: response.data.file.fileSize,
        }));
        
        toast.success('Arquivo enviado com sucesso!');
        return response.data.file.filePath;
      } else {
        toast.error('Erro ao enviar arquivo');
        return null;
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setIsUploading(false);
      toast.error('Erro ao enviar arquivo');
      return null;
    }
  };

  // Limpar o arquivo selecionado
  const clearFileSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setNewMaterial(prev => ({
      ...prev,
      fileName: '',
      fileSize: 0,
      filePath: '',
    }));
  };

  // Salvar novo material
  const handleSaveMaterial = async () => {
    try {
      setLoading(true);
      
      // Se houver um arquivo selecionado, fazer o upload primeiro
      let filePath = newMaterial.filePath;
      if (selectedFile && !filePath) {
        filePath = await handleFileUpload();
        if (!filePath) {
          setLoading(false);
          return;
        }
      }
      
      // Validar campos obrigatórios
      if (!newMaterial.title || !newMaterial.type || !newMaterial.moduleId) {
        toast.error('Preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }
      
      // Verificar se URL ou arquivo foi fornecido
      if (!newMaterial.url && !filePath) {
        toast.error('Forneça uma URL ou faça upload de um arquivo');
        setLoading(false);
        return;
      }
      
      // Preparar dados para envio
      const materialData = {
        ...newMaterial,
        filePath,
      };
      
      // Enviar para a API
      const response = await axios.post('/api/admin/training/materials', materialData);
      
      // Adicionar o novo material à lista
      setMaterials([...materials, response.data]);
      
      // Limpar o formulário e fechar o modal
      resetNewMaterialForm();
      clearFileSelection();
      setShowAddModal(false);
      setLoading(false);
      
      toast.success('Material adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      setError('Ocorreu um erro ao salvar o material.');
      setLoading(false);
      toast.error('Erro ao salvar material');
    }
  };

  // Filtrar materiais com base nos critérios selecionados
  const filteredMaterials = materials.filter(material => {
    let matchesModule = true;
    let matchesLesson = true;
    let matchesType = true;
    let matchesSearch = true;
    
    if (selectedModuleId) {
      matchesModule = material.moduleId === selectedModuleId;
    }
    
    if (selectedLessonId) {
      matchesLesson = material.lessonId === selectedLessonId;
    }
    
    if (selectedType) {
      matchesType = material.type === selectedType;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = 
        material.title.toLowerCase().includes(searchLower) || 
        material.description.toLowerCase().includes(searchLower);
    }
    
    return matchesModule && matchesLesson && matchesType && matchesSearch;
  });

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
            onClick={handleAddMaterial}
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
            
            {/* Seletor de Curso */}
            <div>
              <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Curso
              </label>
              <select
                id="courseSelect"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os cursos</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            
            {/* Seletor de Módulo */}
            <div>
              <label htmlFor="moduleSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Módulo
              </label>
              <select
                id="moduleSelect"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={!selectedCourseId || modules.length === 0}
              >
                <option value="">Todos os módulos</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>{module.name}</option>
                ))}
              </select>
            </div>
            
            {/* Seletor de Aula */}
            <div>
              <label htmlFor="lessonSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Aula
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
                  <option key={lesson.id} value={lesson.id}>{lesson.name}</option>
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
                setSelectedCourseId('');
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
              onClick={handleAddMaterial}
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
                      {material.type === 'pdf' ? (
                        <DocumentTextIcon className="h-5 w-5 text-red-500" />
                      ) : material.type === 'video' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : material.type === 'link' ? (
                        <LinkIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <DocumentIcon className="h-5 w-5 text-secondary-500" />
                      )}
                      <span className="ml-2 text-xs font-medium bg-secondary-100 text-secondary-800 px-2 py-0.5 rounded">
                        {material.type === 'pdf' ? 'PDF' : material.type === 'video' ? 'Vídeo' : material.type === 'link' ? 'Link' : 'Outro'}
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
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este material?')) {
                            setLoading(true);
                            axios.delete(`/api/admin/training/materials/${material.id}`)
                              .then(() => {
                                // Remover o material da lista
                                setMaterials(materials.filter(mat => mat.id !== material.id));
                                setLoading(false);
                              })
                              .catch(err => {
                                console.error('Erro ao excluir material:', err);
                                setError(err.response?.data?.error || 'Ocorreu um erro ao excluir o material.');
                                setLoading(false);
                              });
                          }
                        }}
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
                      <span className="text-secondary-600 ml-2">{new Date(material.createdAt).toLocaleDateString('pt-BR')}</span>
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-secondary-900">Adicionar Novo Material</h2>
                <button 
                  onClick={handleCloseModal}
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
                  name="title"
                  id="title"
                  value={newMaterial.title}
                  onChange={handleNewMaterialChange}
                  className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-2">
                  Descrição:
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={newMaterial.description}
                  onChange={handleNewMaterialChange}
                  rows={3}
                  className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="type" className="block text-sm font-medium text-secondary-700 mb-2">
                  Tipo: <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  id="type"
                  value={newMaterial.type}
                  onChange={handleNewMaterialChange}
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
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="url" className="block text-sm font-medium text-secondary-700">
                    URL: {!selectedFile && <span className="text-red-500">*</span>}
                  </label>
                  <span className="text-xs text-secondary-500">
                    {selectedFile ? 'Opcional com arquivo' : 'Obrigatório sem arquivo'}
                  </span>
                </div>
                <input
                  type="text"
                  name="url"
                  id="url"
                  value={newMaterial.url}
                  onChange={handleNewMaterialChange}
                  placeholder={newMaterial.type === 'pdf' ? 'URL do arquivo PDF' : newMaterial.type === 'video' ? 'URL do vídeo' : 'URL do link'}
                  className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required={!selectedFile}
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="file" className="block text-sm font-medium text-secondary-700">
                    Arquivo: {!newMaterial.url && <span className="text-red-500">*</span>}
                  </label>
                  <span className="text-xs text-secondary-500">
                    {newMaterial.url ? 'Opcional com URL' : 'Obrigatório sem URL'}
                  </span>
                </div>
                
                {!selectedFile ? (
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-secondary-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-secondary-400" />
                      <div className="flex text-sm text-secondary-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>Selecione um arquivo</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-secondary-500">
                        PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP até 100MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between p-4 border border-secondary-300 rounded-md bg-secondary-50">
                    <div className="flex items-center">
                      <DocumentIcon className="h-8 w-8 text-secondary-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-secondary-700">{selectedFile.name}</p>
                        <p className="text-xs text-secondary-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFileSelection}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
                
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-secondary-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-secondary-500 mt-1 text-right">{uploadProgress}%</p>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="moduleId" className="block text-sm font-medium text-secondary-700 mb-2">
                  Módulo: <span className="text-red-500">*</span>
                </label>
                <select
                  name="moduleId"
                  id="moduleId"
                  value={newMaterial.moduleId}
                  onChange={handleNewMaterialChange}
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
                  name="lessonId"
                  id="lessonId"
                  value={newMaterial.lessonId}
                  onChange={handleNewMaterialChange}
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
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMaterial}
                  disabled={loading || isUploading}
                  className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center ${
                    (loading || isUploading) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading || isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isUploading ? 'Enviando...' : 'Salvando...'}
                    </>
                  ) : (
                    'Salvar Material'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default MaterialsPage;
