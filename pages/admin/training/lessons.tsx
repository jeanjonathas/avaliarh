import { NextPage } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, DocumentTextIcon, VideoCameraIcon, BookOpenIcon, ArrowLeftIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import LessonFormModal from '../../../components/admin/training/LessonFormModal';
import DeleteLessonModal from '../../../components/admin/training/DeleteLessonModal';

interface Lesson {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  order: number;
  type: 'VIDEO' | 'AUDIO' | 'SLIDES' | 'TEXT';
  content: string;
  duration: number; // em segundos (para compatibilidade com o modal)
  module?: {
    name: string;
    courseId: string;
  };
  course?: {
    name: string;
  };
  hasFinalTest?: boolean;
  createdAt: string;
}

interface Module {
  id: string;
  name: string;
  courseId: string;
}

interface Course {
  id: string;
  name: string;
}

const LessonsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);

  // Estados para os Modais
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  const fetchLessonsByModule = useCallback((moduleId: string) => {
    setLoading(true);
    axios.get(`/api/admin/training/lessons?moduleId=${moduleId}`)
      .then(response => {
        const lessonsData = Array.isArray(response.data) ? response.data : [];
        setLessons(lessonsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar lições:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar as lições.');
        setLoading(false);
      });
  }, []);

  const fetchModulesByCourse = useCallback((targetCourseId: string) => {
    setLoading(true);
    axios.get(`/api/admin/training/modules?courseId=${targetCourseId}`)
      .then(response => {
        const modulesData = response.data.modules && Array.isArray(response.data.modules) 
          ? response.data.modules 
          : [];
        setModules(modulesData);
        
        // Se o moduleId da URL estiver entre os módulos deste curso, selecione-o
        const urlModuleId = router.query.moduleId as string;
        if (urlModuleId && modulesData.some((m: any) => m.id === urlModuleId)) {
          setSelectedModuleId(urlModuleId);
          fetchLessonsByModule(urlModuleId);
        } else {
          setSelectedModuleId('');
          setLessons([]);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Erro ao buscar módulos:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os módulos.');
        setLoading(false);
      });
  }, [router.query.moduleId, fetchLessonsByModule]);

  // Buscar cursos disponíveis e tratar parâmetros da URL
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todos os cursos primeiro
      axios.get('/api/admin/training/courses')
        .then(async (response) => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
          
          const urlCourseId = router.query.courseId as string;
          const urlModuleId = router.query.moduleId as string;

          if (urlModuleId) {
            let finalCourseId = urlCourseId;
            
            // Se não tivermos o courseId na URL, buscamos via API
            if (!finalCourseId) {
              try {
                const modRes = await axios.get(`/api/admin/training/modules/${urlModuleId}`);
                finalCourseId = modRes.data.courseId;
              } catch (err) {
                console.error('Erro ao buscar detalhes do módulo:', err);
              }
            }

            if (finalCourseId) {
              setCourseId(finalCourseId);
              setSelectedModuleId(urlModuleId);
              // O useEffect [courseId] cuidará de buscar os módulos
              // Mas precisamos disparar a busca de lições após os módulos carregarem
              // Passamos o moduleId para fetchModulesByCourse através de uma variável local ou estado temporário
              // Para simplificar, vamos deixar o useEffect disparar e tratar lá
            } else {
              setLoading(false);
            }
          } else if (urlCourseId) {
            setCourseId(urlCourseId);
          } else {
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os cursos.');
          setLoading(false);
        });
    }
  }, [status, router, router.isReady, router.query.courseId, router.query.moduleId, setCourses, setCourseId, setSelectedModuleId, setLoading, setError]); // Incluir o router e query params como dependências

  useEffect(() => {
    if (courseId) {
      fetchModulesByCourse(courseId);
    } else {
      setModules([]);
      setSelectedModuleId('');
      setLessons([]);
      setLoading(false);
    }
  }, [courseId, fetchModulesByCourse, setModules, setSelectedModuleId, setLessons, setLoading]);

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleId = e.target.value;
    setSelectedModuleId(moduleId);
    
    if (moduleId) {
      fetchLessonsByModule(moduleId);
      
      // Atualizar a URL com o ID do módulo selecionado
      router.push({
        pathname: '/admin/training/lessons',
        query: { moduleId }
      }, undefined, { shallow: true });
    } else {
      setLessons([]);
    }
  };

  // Função para obter o ícone com base no tipo de aula
  const getLessonTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'VIDEO':
        return <VideoCameraIcon className="h-5 w-5 text-blue-600" />;
      case 'TEXT':
        return <DocumentTextIcon className="h-5 w-5 text-primary-600" />;
      case 'AUDIO':
        return <MusicalNoteIcon className="h-5 w-5 text-purple-600" />;
      case 'SLIDES':
        return <BookOpenIcon className="h-5 w-5 text-green-600" />;
      default:
        return <BookOpenIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  // Função para obter o texto do tipo de aula
  const getLessonTypeText = (type: string) => {
    switch (type.toUpperCase()) {
      case 'VIDEO':
        return 'Vídeo';
      case 'TEXT':
        return 'Texto';
      case 'AUDIO':
        return 'Áudio';
      case 'SLIDES':
        return 'Slides';
      default:
        return 'Outro';
    }
  };

  const handleCreateLesson = () => {
    setCurrentLesson(null);
    setIsLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setIsLessonModalOpen(true);
  };

  const handleDeleteClick = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setIsDeleteModalOpen(true);
  };

  const handleModalSave = () => {
    if (selectedModuleId) {
      fetchLessonsByModule(selectedModuleId);
    }
  };

  // Função para formatar a duração
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
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
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Aulas</h1>
          {selectedModuleId && (
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  router.push(`/admin/training/modules/${selectedModuleId}`);
                }}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Voltar para o Módulo
              </button>
              
              <button
                onClick={handleCreateLesson}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Nova Aula
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Selecione um curso
              </label>
              <select
                id="courseSelect"
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Selecione um curso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="moduleSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Selecione um módulo
              </label>
              <select
                id="moduleSelect"
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={selectedModuleId}
                onChange={handleModuleChange}
                disabled={!courseId || modules.length === 0}
              >
                <option value="">Selecione um módulo</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>{module.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedModuleId ? (
          lessons.length === 0 && !loading ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <BookOpenIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
              <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhuma aula encontrada</h2>
              <p className="text-secondary-500 mb-4">Este módulo ainda não possui aulas.</p>
              <button
                onClick={handleCreateLesson}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Criar Primeira Aula
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Ordem
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Duração
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {lessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">{lesson.order}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-secondary-900">{lesson.name}</div>
                        <div className="text-sm text-secondary-500 line-clamp-1">{lesson.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getLessonTypeIcon(lesson.type)}
                          <span className="ml-2 text-sm text-secondary-600">{getLessonTypeText(lesson.type)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">{formatDuration(lesson.duration)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditLesson(lesson)}
                          className="text-primary-600 hover:text-primary-800 mr-4 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(lesson)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <BookOpenIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Selecione um módulo</h2>
            <p className="text-secondary-500">Selecione um módulo para visualizar suas aulas.</p>
          </div>
        )}
      </div>

      {selectedModuleId && (
        <LessonFormModal
          isOpen={isLessonModalOpen}
          onClose={() => setIsLessonModalOpen(false)}
          onSave={handleModalSave}
          moduleId={selectedModuleId}
          lesson={currentLesson || undefined}
        />
      )}

      {currentLesson && (
        <DeleteLessonModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={handleModalSave}
          lesson={currentLesson}
        />
      )}
    </AdminLayout>
  );
};

export default LessonsPage;
