import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../../components/admin/AdminLayout';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import axios from 'axios';

interface Sector {
  id: string;
  name: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  name: string;
  description: string;
  type: 'TEXT' | 'SLIDES' | 'VIDEO' | 'AUDIO';
  content: string;
  videoUrl?: string;
  slidesUrl?: string;
  duration?: number;
  order: number;
}

export default function NewCourse() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sectorId: '',
    showResults: true,
    finalTestRequired: false
  });

  // Modules and lessons state
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  
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
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated') {
      // Fetch sectors
      setLoading(true);
      axios.get('/api/admin/sectors')
        .then(response => {
          setSectors(response.data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar setores:', err);
          setError('Não foi possível carregar os setores. Por favor, tente novamente.');
          setLoading(false);
        });
    }
  }, [status, router]);

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
      type: lessonForm.type as 'TEXT' | 'SLIDES' | 'VIDEO' | 'AUDIO',
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
      const courseData = {
        ...formData,
        modules: modules.map(module => ({
          name: module.name,
          description: module.description,
          order: module.order,
          lessons: module.lessons.map(lesson => ({
            name: lesson.name,
            description: lesson.description,
            type: lesson.type,
            content: lesson.content,
            videoUrl: lesson.videoUrl,
            slidesUrl: lesson.slidesUrl,
            duration: lesson.duration,
            order: lesson.order
          }))
        }))
      };

      await axios.post('/api/admin/training/courses', courseData);
      
      // Redirect to courses page after successful creation
      router.push('/admin/training/courses');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ocorreu um erro ao criar o curso. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
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
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nome do Curso *
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Ex: Treinamento de Atendimento ao Cliente"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Descrição
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Descreva o objetivo e conteúdo do curso"
                    />
                  </div>

                  {/* Sector */}
                  <div>
                    <label htmlFor="sectorId" className="block text-sm font-medium text-gray-700">
                      Setor Relacionado
                    </label>
                    <select
                      id="sectorId"
                      name="sectorId"
                      value={formData.sectorId}
                      onChange={handleChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="">Selecione um setor (opcional)</option>
                      {sectors.map((sector: any) => (
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

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="finalTestRequired"
                          name="finalTestRequired"
                          type="checkbox"
                          checked={formData.finalTestRequired}
                          onChange={handleChange}
                          className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="finalTestRequired" className="font-medium text-gray-700">
                          Teste final obrigatório
                        </label>
                        <p className="text-gray-500">Os alunos precisarão completar um teste final para concluir o curso.</p>
                      </div>
                    </div>
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
                        <label htmlFor="moduleName" className="block text-sm font-medium text-gray-700">
                          Nome do Módulo *
                        </label>
                        <input
                          type="text"
                          id="moduleName"
                          name="name"
                          value={moduleForm.name}
                          onChange={handleModuleFormChange}
                          className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        <label htmlFor="moduleDescription" className="block text-sm font-medium text-gray-700 mt-4">
                          Descrição do Módulo
                        </label>
                        <textarea
                          id="moduleDescription"
                          name="description"
                          rows={3}
                          value={moduleForm.description}
                          onChange={handleModuleFormChange}
                          className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
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
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum módulo adicionado</h3>
                        <p className="mt-1 text-sm text-gray-500">Comece adicionando o primeiro módulo ao seu curso.</p>
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => setShowModuleForm(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
                            <div className="bg-primary-50 px-4 py-4 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 bg-primary-600 rounded-full h-8 w-8 flex items-center justify-center text-white font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="ml-3">
                                    <h4 className="text-lg font-medium text-gray-900">{module.name}</h4>
                                    {module.description && (
                                      <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentModuleIndex(index);
                                    setShowLessonForm(true);
                                  }}
                                  className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Adicionar Lição
                                </button>
                              </div>
                            </div>
                            
                            {showLessonForm && currentModuleIndex === index && (
                              <div className="p-6 border-b border-gray-200 bg-gray-50">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Nova Lição</h4>
                                <div className="grid grid-cols-1 gap-4">
                                  <div>
                                    <label htmlFor="lessonName" className="block text-sm font-medium text-gray-700">
                                      Nome da Lição *
                                    </label>
                                    <input
                                      type="text"
                                      id="lessonName"
                                      name="name"
                                      value={lessonForm.name}
                                      onChange={handleLessonFormChange}
                                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label htmlFor="lessonDescription" className="block text-sm font-medium text-gray-700">
                                      Descrição da Lição
                                    </label>
                                    <textarea
                                      id="lessonDescription"
                                      name="description"
                                      rows={2}
                                      value={lessonForm.description}
                                      onChange={handleLessonFormChange}
                                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label htmlFor="lessonType" className="block text-sm font-medium text-gray-700">
                                      Tipo de Conteúdo *
                                    </label>
                                    <select
                                      id="lessonType"
                                      name="type"
                                      value={lessonForm.type}
                                      onChange={handleLessonFormChange}
                                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    >
                                      <option value="TEXT">Texto</option>
                                      <option value="SLIDES">Slides</option>
                                      <option value="VIDEO">Vídeo</option>
                                      <option value="AUDIO">Áudio</option>
                                    </select>
                                  </div>
                                  
                                  {lessonForm.type === 'VIDEO' && (
                                    <div>
                                      <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700">
                                        URL do Vídeo *
                                      </label>
                                      <input
                                        type="text"
                                        id="videoUrl"
                                        name="videoUrl"
                                        value={lessonForm.videoUrl}
                                        onChange={handleLessonFormChange}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                      />
                                    </div>
                                  )}
                                  
                                  {lessonForm.type === 'SLIDES' && (
                                    <div>
                                      <label htmlFor="slidesUrl" className="block text-sm font-medium text-gray-700">
                                        URL das Slides *
                                      </label>
                                      <input
                                        type="text"
                                        id="slidesUrl"
                                        name="slidesUrl"
                                        value={lessonForm.slidesUrl}
                                        onChange={handleLessonFormChange}
                                        placeholder="https://docs.google.com/presentation/..."
                                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                      />
                                    </div>
                                  )}
                                  
                                  <div>
                                    <label htmlFor="lessonContent" className="block text-sm font-medium text-gray-700">
                                      Conteúdo da Lição *
                                    </label>
                                    <textarea
                                      id="lessonContent"
                                      name="content"
                                      rows={4}
                                      value={lessonForm.content}
                                      onChange={handleLessonFormChange}
                                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    />
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
                                    onClick={() => addLesson(index)}
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              </div>
                            )}
                            
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
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
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
                                      {lesson.description && (
                                        <p className="text-sm text-gray-500 mt-2 ml-8">{lesson.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

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
