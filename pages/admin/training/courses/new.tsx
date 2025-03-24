import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getSession, useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '../../../../components/admin/AdminLayout';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { TestSelectorTarget } from '../../../../components/admin/training/TestSelectorModal';
import TestAssociationManager from '../../../../components/admin/training/TestAssociationManager';
import RichTextEditor from '../../../../components/admin/training/RichTextEditor';
import axios from 'axios';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

interface Sector {
  id: string;
  name: string;
}

interface Test {
  id: string;
  name: string;
  description?: string;
}

interface Module {
  id?: string;
  name: string;
  description: string;
  order: number;
  lessons: Lesson[];
  finalTestId?: string;
  finalTest?: Test;
}

interface Lesson {
  id?: string;
  name: string;
  description: string;
  type: 'TEXT' | 'VIDEO' | 'SLIDES' | 'AUDIO';
  content: string;
  videoUrl?: string;
  slidesUrl?: string;
  duration?: number;
  order: number;
  finalTestId?: string;
  finalTest?: Test;
}

interface FormData {
  name: string;
  description: string;
  sectorId: string;
  showResults: boolean;
  finalTestId: string;
  imageUrl: string;
}

export default function NewCoursePage({ sectors, tests }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sectorId: '',
    showResults: true,
    finalTestId: '',
    imageUrl: ''
  });

  // Modules and lessons state
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectorsState, setSectors] = useState<Sector[]>([]);
  const [testsState, setTests] = useState<Test[]>([]);
  
  // New module/lesson form state
  const [moduleForm, setModuleForm] = useState({
    name: '',
    description: ''
  });
  
  const [lessonForm, setLessonForm] = useState({
    name: '',
    description: '',
    type: 'TEXT',
    content: '',
    videoUrl: '',
    slidesUrl: '',
    duration: undefined
  });

  useEffect(() => {
    if (router.query.error) {
      setError(router.query.error as string);
    }

    if (status === 'authenticated') {
      // Fetch sectors and tests
      setLoading(true);
      
      // Fetch sectors
      axios.get('/api/admin/training/sectors')
        .then(response => {
          setSectors(response.data || []);
        })
        .catch(err => {
          console.error('Erro ao buscar setores:', err);
          setError('Não foi possível carregar os setores. Por favor, tente novamente.');
        });
      
      // Fetch tests
      axios.get('/api/admin/training/tests')
        .then(response => {
          setTests(response.data.tests || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar testes:', err);
          setError('Não foi possível carregar os testes. Por favor, tente novamente.');
          setLoading(false);
        });
    }
  }, [status, router.query.error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleModuleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModuleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLessonFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLessonForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addModule = () => {
    if (!moduleForm.name.trim()) {
      setError('O título do módulo é obrigatório');
      return;
    }

    const newModule: Module = {
      id: `temp-${Date.now()}`,
      name: moduleForm.name,
      description: moduleForm.description,
      order: modules.length + 1,
      lessons: []
    };

    setModules([...modules, newModule]);
    setModuleForm({ name: '', description: '' });
    setShowModuleForm(false);
    setError(null);
  };

  const addLesson = (moduleIndex: number) => {
    if (!lessonForm.name.trim()) {
      setError('O título da lição é obrigatório');
      return;
    }

    const updatedModules = [...modules];
    const newLesson: Lesson = {
      id: `temp-${Date.now()}`,
      name: lessonForm.name,
      description: lessonForm.description,
      type: lessonForm.type as 'TEXT' | 'VIDEO' | 'SLIDES' | 'AUDIO',
      content: lessonForm.content,
      order: updatedModules[moduleIndex].lessons.length + 1
    };

    if (lessonForm.type === 'VIDEO' && lessonForm.videoUrl) {
      newLesson.videoUrl = lessonForm.videoUrl;
    }

    if (lessonForm.type === 'SLIDES' && lessonForm.slidesUrl) {
      newLesson.slidesUrl = lessonForm.slidesUrl;
    }

    updatedModules[moduleIndex].lessons.push(newLesson);
    setModules(updatedModules);
    setLessonForm({
      name: '',
      description: '',
      type: 'TEXT',
      content: '',
      videoUrl: '',
      slidesUrl: '',
      duration: undefined
    });
    setShowLessonForm(false);
    setCurrentModuleIndex(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('O nome do curso é obrigatório');
      setSubmitting(false);
      return;
    }

    if (modules.length === 0) {
      setError('O curso deve ter pelo menos um módulo');
      setSubmitting(false);
      return;
    }

    // Verificar se todos os módulos têm pelo menos uma lição
    const emptyModules = modules.filter(module => module.lessons.length === 0);
    if (emptyModules.length > 0) {
      setError(`O(s) módulo(s) "${emptyModules.map(m => m.name).join(', ')}" não possui(em) lições`);
      setSubmitting(false);
      return;
    }

    try {
      // Upload image if selected
      let imageUrlToSave = '';
      
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', 'course-banner');
        
        setUploadingImage(true);
        const uploadResponse = await axios.post('/api/admin/training/upload', formData);
        imageUrlToSave = uploadResponse.data.url;
        setUploadingImage(false);
      } else {
        // Use default banner image
        imageUrlToSave = '/images/baner-curso-padrao.jpg';
      }
      
      // Create course with image URL
      const response = await axios.post('/api/admin/training/courses', {
        ...formData,
        imageUrl: imageUrlToSave,
        modules: modules.map(module => ({
          ...module,
          lessons: module.lessons
        }))
      });
      
      router.push('/admin/training/courses');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocorreu um erro ao criar o curso. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Novo Curso | AvaliaRH</title>
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="mr-4 text-primary-600 hover:text-primary-900"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Novo Curso</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <form onSubmit={handleSubmit}>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Course Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                      Nome do Curso *
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ex: Treinamento de Atendimento ao Cliente"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Descreva o objetivo e conteúdo do curso"
                    />
                  </div>

                  {/* Sector */}
                  <div>
                    <label htmlFor="sectorId" className="block text-sm font-medium text-secondary-700 mb-1">
                      Setor Relacionado
                    </label>
                    <select
                      id="sectorId"
                      name="sectorId"
                      value={formData.sectorId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecione um setor (opcional)</option>
                      {sectorsState.map((sector: any) => (
                        <option key={sector.id} value={sector.id}>
                          {sector.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Configuration Options */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Configurações</h3>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="showResults"
                          name="showResults"
                          type="checkbox"
                          checked={formData.showResults}
                          onChange={handleChange}
                          className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="showResults" className="font-medium text-gray-700">
                          Mostrar resultados para os alunos
                        </label>
                        <p className="text-gray-500">Os alunos poderão ver seus resultados e pontuações nos testes.</p>
                      </div>
                    </div>

                    {/* Teste Final do Curso */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-medium text-gray-900">Teste Final do Curso</h4>
                        <TestAssociationManager
                          tests={testsState}
                          onAssociateTest={(target, testId) => {
                            if (target.type === 'course') {
                              setFormData(prev => ({ ...prev, finalTestId: testId }));
                            }
                          }}
                          onRemoveTest={(target) => {
                            if (target.type === 'course') {
                              setFormData(prev => ({ ...prev, finalTestId: '' }));
                            }
                          }}
                          type="course"
                          hasTest={!!formData.finalTestId}
                          moduleIndex={undefined}
                          lessonIndex={undefined}
                        />
                      </div>
                      {formData.finalTestId && (
                        <div className="mt-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                          {testsState.find(t => t.id === formData.finalTestId)?.name || 'Teste selecionado'}
                        </div>
                      )}
                      {!formData.finalTestId && (
                        <p className="text-sm text-gray-500 mt-1">
                          Associe um teste final para avaliar o conhecimento do aluno ao concluir o curso.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Banner */}
                  <div>
                    <label htmlFor="imageUrl" className="block text-sm font-medium text-secondary-700 mb-1">
                      Imagem de Capa do Curso
                    </label>
                    <input
                      type="file"
                      id="imageUrl"
                      name="imageUrl"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setImagePreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Se nenhuma imagem for selecionada, será utilizada uma imagem padrão.
                    </p>
                    {imagePreview && (
                      <div className="mt-2 relative w-full h-48">
                        <Image 
                          src={imagePreview} 
                          alt="Imagem de capa do curso" 
                          layout="fill"
                          objectFit="cover"
                          className="rounded-md"
                        />
                      </div>
                    )}
                  </div>

                  {/* Modules */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Módulos do Curso</h3>
                      <button
                        type="button"
                        onClick={() => setShowModuleForm(true)}
                        className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Adicionar Módulo
                      </button>
                    </div>
                    
                    {showModuleForm && (
                      <div className="mt-4 bg-white p-6 shadow-sm rounded-lg border border-gray-200">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Novo Módulo</h4>
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Nome do Módulo *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={moduleForm.name}
                            onChange={handleModuleFormChange}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Ex: Introdução ao Atendimento"
                            required
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Descrição do Módulo
                          </label>
                          <textarea
                            name="description"
                            value={moduleForm.description}
                            onChange={handleModuleFormChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Descreva o conteúdo deste módulo"
                          />
                        </div>

                        <div className="mt-4 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowModuleForm(false);
                              setModuleForm({ name: '', description: '' });
                            }}
                            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={addModule}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {modules.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum módulo adicionado</h3>
                        <p className="mt-1 text-sm text-gray-500">Comece adicionando o primeiro módulo ao seu curso.</p>
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => setShowModuleForm(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Adicionar Módulo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {modules.map((module, index) => (
                          <div key={module.id} className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                              <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                  Módulo {index + 1}: {module.name}
                                </h3>
                                {module.description && (
                                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                    {module.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                {/* Botão para associar/remover teste ao módulo */}
                                <TestAssociationManager
                                  tests={testsState}
                                  onAssociateTest={(target, testId) => {
                                    if (target.type === 'module' && target.index === index) {
                                      const updatedModules = [...modules];
                                      updatedModules[index].finalTestId = testId;
                                      setModules(updatedModules);
                                    }
                                  }}
                                  onRemoveTest={(target) => {
                                    if (target.type === 'module' && target.index === index) {
                                      const updatedModules = [...modules];
                                      updatedModules[index].finalTestId = undefined;
                                      setModules(updatedModules);
                                    }
                                  }}
                                  type="module"
                                  hasTest={!!module.finalTestId}
                                  moduleIndex={index}
                                  compact={true}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentModuleIndex(index);
                                    setShowLessonForm(true);
                                  }}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Lição
                                </button>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              {module.lessons.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-500">Nenhuma lição adicionada a este módulo.</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentModuleIndex(index);
                                      setShowLessonForm(true);
                                    }}
                                    className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                  >
                                    Adicionar Lição
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {module.lessons.map((lesson, lessonIndex) => (
                                    <div key={lesson.id} className="bg-gray-50 rounded-md border border-gray-200 p-4">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0">
                                            {lesson.type === 'TEXT' && (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                            )}
                                            {lesson.type === 'VIDEO' && (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                              </svg>
                                            )}
                                            {lesson.type === 'SLIDES' && (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2m-6 0a2 2 0 00-2 2v2m0 4h2m6-4h2a2 2 0 012 2v2m-6 0h2a2 2 0 012 2" />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="ml-3">
                                            <h5 className="text-md font-medium text-gray-900">Lição {lessonIndex + 1}: {lesson.name}</h5>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                                              {lesson.type === 'TEXT' ? 'Texto' : lesson.type === 'VIDEO' ? 'Vídeo' : lesson.type === 'SLIDES' ? 'Slides' : 'Áudio'}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <TestAssociationManager
                                            tests={testsState}
                                            onAssociateTest={(target, testId) => {
                                              if (target.type === 'lesson' && target.index === index && target.lessonIndex === lessonIndex) {
                                                const updatedModules = [...modules];
                                                updatedModules[index].lessons[lessonIndex].finalTestId = testId;
                                                setModules(updatedModules);
                                              }
                                            }}
                                            onRemoveTest={(target) => {
                                              if (target.type === 'lesson' && target.index === index && target.lessonIndex === lessonIndex) {
                                                const updatedModules = [...modules];
                                                updatedModules[index].lessons[lessonIndex].finalTestId = undefined;
                                                setModules(updatedModules);
                                              }
                                            }}
                                            type="lesson"
                                            hasTest={!!lesson.finalTestId}
                                            moduleIndex={index}
                                            lessonIndex={lessonIndex}
                                            compact={true}
                                          />
                                        </div>
                                      </div>
                                      {lesson.description && (
                                        <p className="text-sm text-gray-500 mt-2 ml-8">{lesson.description}</p>
                                      )}
                                      {lesson.content && lesson.type === 'TEXT' && (
                                        <div className="mt-2 ml-8">
                                          <div 
                                            className="prose max-w-none p-3 border border-secondary-200 rounded-md bg-gray-50"
                                            dangerouslySetInnerHTML={{ __html: lesson.content }}
                                          />
                                        </div>
                                      )}
                                      {/* Exibir teste associado à aula, se houver */}
                                      {lesson.finalTestId && (
                                        <div className="mt-2 ml-8 bg-gray-100 p-2 rounded-md border border-gray-200">
                                          <div className="flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-xs font-medium text-gray-700">
                                              Teste: {testsState.find(t => t.id === lesson.finalTestId)?.name || 'Teste selecionado'}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Exibir teste associado ao módulo, se houver */}
                            {module.finalTestId && (
                              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-700">
                                    Teste final do módulo: {testsState.find(t => t.id === module.finalTestId)?.name || 'Teste selecionado'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showLessonForm && currentModuleIndex !== null && (
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Nova Lição</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="lessonName" className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome da Lição *
                      </label>
                      <input
                        type="text"
                        id="lessonName"
                        name="name"
                        value={lessonForm.name}
                        onChange={handleLessonFormChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Ex: Princípios de Atendimento ao Cliente"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lessonDescription" className="block text-sm font-medium text-secondary-700 mb-1">
                        Descrição da Lição
                      </label>
                      <textarea
                        id="lessonDescription"
                        name="description"
                        rows={2}
                        value={lessonForm.description}
                        onChange={handleLessonFormChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Descreva o conteúdo desta lição"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lessonType" className="block text-sm font-medium text-secondary-700 mb-1">
                        Tipo de Conteúdo *
                      </label>
                      <select
                        id="lessonType"
                        name="type"
                        value={lessonForm.type}
                        onChange={handleLessonFormChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="TEXT">Texto</option>
                        <option value="SLIDES">Slides</option>
                        <option value="VIDEO">Vídeo</option>
                        <option value="AUDIO">Áudio</option>
                      </select>
                    </div>
                    
                    {lessonForm.type === 'VIDEO' && (
                      <div>
                        <label htmlFor="videoUrl" className="block text-sm font-medium text-secondary-700 mb-1">
                          URL do Vídeo *
                        </label>
                        <input
                          type="url"
                          id="videoUrl"
                          name="videoUrl"
                          value={lessonForm.videoUrl}
                          onChange={handleLessonFormChange}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}
                    
                    {lessonForm.type === 'SLIDES' && (
                      <div>
                        <label htmlFor="slidesUrl" className="block text-sm font-medium text-secondary-700 mb-1">
                          URL das Slides *
                        </label>
                        <input
                          type="url"
                          id="slidesUrl"
                          name="slidesUrl"
                          value={lessonForm.slidesUrl}
                          onChange={handleLessonFormChange}
                          placeholder="https://docs.google.com/presentation/..."
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="lessonContent" className="block text-sm font-medium text-secondary-700 mb-1">
                        Conteúdo da Lição *
                      </label>
                      <div className="flex flex-col">
                        {lessonForm.type === 'TEXT' ? (
                          <>
                            <textarea
                              id="lessonContent"
                              name="content"
                              rows={6}
                              value={lessonForm.content}
                              onChange={handleLessonFormChange}
                              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Digite o conteúdo da lição aqui..."
                            />
                            <div className="flex justify-between mt-2">
                              <div className="text-xs text-gray-500">
                                {lessonForm.content ? (
                                  <span>Edição básica. Para formatação avançada, use o editor completo.</span>
                                ) : (
                                  <span>Você pode inserir texto simples aqui ou usar o editor completo para formatação avançada.</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowTextEditor(true)}
                                className="self-end inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Abrir Editor Completo
                              </button>
                            </div>
                            {lessonForm.content && (
                              <div className="mt-3 border border-gray-200 rounded-md p-3 bg-gray-50">
                                <h6 className="text-xs font-medium text-gray-500 mb-2">Pré-visualização:</h6>
                                <div 
                                  className="prose max-w-none"
                                  dangerouslySetInnerHTML={{ __html: lessonForm.content }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <textarea
                            id="lessonContent"
                            name="content"
                            rows={4}
                            value={lessonForm.content}
                            onChange={handleLessonFormChange}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Conteúdo da lição (para lições do tipo texto)"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLessonForm(false);
                        setLessonForm({
                          name: '',
                          description: '',
                          type: 'TEXT',
                          content: '',
                          videoUrl: '',
                          slidesUrl: '',
                          duration: undefined
                        });
                      }}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => addLesson(currentModuleIndex)}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
              {/* Editor de texto rico */}
              <RichTextEditor
                isOpen={showTextEditor}
                onClose={() => setShowTextEditor(false)}
                initialContent={lessonForm.content}
                onSave={(content) => {
                  setLessonForm(prev => ({ ...prev, content }));
                }}
                title="Editor de Conteúdo da Aula"
              />
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="small" text="" />
                      <span className="ml-2">Salvando...</span>
                    </>
                  ) : (
                    'Criar Curso'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
