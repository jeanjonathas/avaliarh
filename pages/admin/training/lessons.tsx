import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, DocumentTextIcon, VideoCameraIcon, BookOpenIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  order: number;
  type: 'video' | 'text' | 'pdf' | 'quiz';
  duration: number; // em minutos
  module?: {
    name: string;
    courseId: string;
  };
  course?: {
    name: string;
  };
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

  // Buscar cursos disponíveis
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
            setCourseId(urlCourseId);
            fetchModulesByCourse(urlCourseId);
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
  }, [status, router]);

  // Buscar módulos quando um curso for selecionado
  useEffect(() => {
    if (courseId) {
      fetchModulesByCourse(courseId);
    }
  }, [courseId]);

  const fetchModulesByCourse = (courseId: string) => {
    setLoading(true);
    axios.get(`/api/admin/training/modules?courseId=${courseId}`)
      .then(response => {
        const modulesData = Array.isArray(response.data) ? response.data : [];
        setModules(modulesData);
        setSelectedModuleId('');
        setLessons([]);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar módulos:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os módulos.');
        setLoading(false);
      });
  };

  const fetchLessonsByModule = (moduleId: string) => {
    setLoading(true);
    axios.get(`/api/admin/training/lessons?moduleId=${moduleId}`)
      .then(response => {
        const lessonsData = Array.isArray(response.data) ? response.data : [];
        setLessons(lessonsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar aulas:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar as aulas.');
        setLoading(false);
      });
  };

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
    switch (type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-blue-600" />;
      case 'quiz':
        return <DocumentTextIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <BookOpenIcon className="h-5 w-5 text-primary-600" />;
    }
  };

  // Função para obter o texto do tipo de aula
  const getLessonTypeText = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo';
      case 'text':
        return 'Texto';
      case 'pdf':
        return 'PDF';
      case 'quiz':
        return 'Quiz';
      default:
        return 'Outro';
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
                onClick={() => {
                  router.push(`/admin/training/modules/${selectedModuleId}/lessons/new`);
                }}
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
                onClick={() => router.push(`/admin/training/modules/${selectedModuleId}/lessons/new`)}
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
                        <div className="text-sm font-medium text-secondary-900">{lesson.title}</div>
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
                        <Link
                          href={`/admin/training/lessons/${lesson.id}`}
                          className="text-primary-600 hover:text-primary-800 mr-3"
                        >
                          Visualizar
                        </Link>
                        <Link
                          href={`/admin/training/lessons/${lesson.id}/edit`}
                          className="text-secondary-600 hover:text-secondary-800"
                        >
                          Editar
                        </Link>
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
    </AdminLayout>
  );
};

export default LessonsPage;
