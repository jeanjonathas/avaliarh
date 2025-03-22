import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import axios from 'axios'
import Link from 'next/link'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Módulos</h1>
          {selectedCourseId && (
            <button
              onClick={() => {
                router.push(`/admin/training/courses/${selectedCourseId}`);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar para o Curso
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione um curso para ver seus módulos:
            </label>
            <select
              id="courseSelect"
              value={selectedCourseId}
              onChange={handleCourseChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 mx-auto text-gray-400 mb-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" 
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhum módulo encontrado</h2>
              <p className="text-gray-500 mb-4">Este curso ainda não possui módulos.</p>
              <button
                onClick={() => router.push(`/admin/training/courses/${selectedCourseId}`)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Gerenciar Módulos no Curso
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map(module => (
                <div 
                  key={module.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-semibold text-gray-800 line-clamp-1">{module.name}</h2>
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                        Ordem: {module.order}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{module.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="font-semibold text-primary-700">{module.totalLessons || 0}</div>
                        <div className="text-gray-500">Lições</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <div className="font-semibold text-primary-700">
                          {module.hasFinalTest ? 'Sim' : 'Não'}
                        </div>
                        <div className="text-gray-500">Teste Final</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => router.push(`/admin/training/courses/${selectedCourseId}`)}
                        className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 text-sm"
                      >
                        Gerenciar Módulo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 mx-auto text-gray-400 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Selecione um curso</h2>
            <p className="text-gray-500 mb-4">Por favor, selecione um curso para visualizar seus módulos.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default TrainingModules
