import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs'
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation'
import axios from 'axios'
import Link from 'next/link'
import { PlusIcon, ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline'

interface Module {
  id: string;
  name: string;
  description: string;
  courseId: string;
  order: number;
  course?: {
    name: string;
  };
  totalLessons?: number;
  hasFinalTest?: boolean;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
}

const TrainingModules: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
    
    if (status === 'authenticated') {
      // Buscar cursos da API
      axios.get('/api/admin/training/courses')
        .then(response => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
          
          // Se houver um curso na URL, selecione-o
          const courseId = router.query.courseId as string;
          if (courseId) {
            setSelectedCourseId(courseId);
            fetchModulesByCourse(courseId);
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
  }, [status, router])
  
  const fetchModulesByCourse = (courseId: string) => {
    setLoading(true);
    axios.get(`/api/admin/training/modules?courseId=${courseId}`)
      .then(response => {
        const modulesData = Array.isArray(response.data) ? response.data : [];
        setModules(modulesData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar módulos:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os módulos.');
        setLoading(false);
      });
  };
  
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    
    if (courseId) {
      fetchModulesByCourse(courseId);
      
      // Atualizar a URL com o ID do curso selecionado
      router.push({
        pathname: '/admin/training/modules',
        query: { courseId }
      }, undefined, { shallow: true });
    } else {
      setModules([]);
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
    )
  }
  
  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
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
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Módulos</h1>
          {selectedCourseId && (
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  router.push(`/admin/training/courses/${selectedCourseId}`);
                }}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Voltar para o Curso
              </button>
              
              <button
                onClick={() => {
                  router.push(`/admin/training/courses/${selectedCourseId}/modules/new`);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Módulo
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
          <div className="mb-4">
            <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
              Selecione um curso para ver seus módulos:
            </label>
            <select
              id="courseSelect"
              value={selectedCourseId}
              onChange={handleCourseChange}
              className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Selecione um curso</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCourseId ? (
          modules.length === 0 && !loading ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <BookOpenIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
              <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum módulo encontrado</h2>
              <p className="text-secondary-500 mb-4">Este curso ainda não possui módulos.</p>
              <button
                onClick={() => router.push(`/admin/training/courses/${selectedCourseId}/modules/new`)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Criar Primeiro Módulo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map(module => (
                <div 
                  key={module.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-semibold text-secondary-800 line-clamp-1">{module.name}</h2>
                      <span className="bg-secondary-100 text-secondary-600 text-xs font-medium px-2 py-1 rounded-full">
                        Ordem: {module.order}
                      </span>
                    </div>
                    
                    <p className="text-secondary-600 mb-4 line-clamp-2">{module.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                      <div className="bg-secondary-50 p-2 rounded text-center">
                        <div className="font-semibold text-primary-700">{module.totalLessons || 0}</div>
                        <div className="text-secondary-500">Lições</div>
                      </div>
                      <div className="bg-secondary-50 p-2 rounded text-center">
                        <div className="font-semibold text-primary-700">
                          {module.hasFinalTest ? 'Sim' : 'Não'}
                        </div>
                        <div className="text-secondary-500">Teste Final</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between">
                      <Link
                        href={`/admin/training/modules/${module.id}/lessons`}
                        className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200 text-sm"
                      >
                        Ver Aulas
                      </Link>
                      <Link
                        href={`/admin/training/modules/${module.id}`}
                        className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 text-sm"
                      >
                        Gerenciar Módulo
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <BookOpenIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Selecione um curso</h2>
            <p className="text-secondary-500">Selecione um curso para visualizar seus módulos.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TrainingModules;
