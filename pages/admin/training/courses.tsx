import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'
import axios from 'axios'
import Link from 'next/link'

interface Course {
  id: string;
  name: string;
  description: string;
  sectorId: string;
  sector?: {
    name: string;
  };
  totalModules?: number;
  totalLessons?: number;
  totalStudents?: number;
  createdAt: string;
}

const TrainingCourses: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
    
    if (status === 'authenticated') {
      // Buscar cursos da API
      axios.get('/api/admin/training/courses')
        .then(response => {
          // Verificar se os dados retornados são um array
          const coursesData = Array.isArray(response.data) ? response.data : [];
          console.log('Dados de cursos recebidos:', response.data);
          setCourses(coursesData);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os cursos.');
          setLoading(false);
        });
    }
  }, [status, router])
  
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
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Cursos</h1>
          <button
            onClick={() => router.push('/admin/training/courses/new')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Novo Curso
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {courses.length === 0 && !loading && !error ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhum curso encontrado</h2>
            <p className="text-gray-500 mb-4">Comece criando seu primeiro curso de treinamento.</p>
            <button
              onClick={() => router.push('/admin/training/courses/new')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
            >
              Criar Curso
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(courses) && courses.map(course => (
              <Link 
                href={`/admin/training/courses/${course.id}`} 
                key={course.id}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-1">{course.name}</h2>
                  <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Setor: {course.sector?.name || 'Não especificado'}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="font-semibold text-primary-700">{course.totalModules || 0}</div>
                      <div className="text-gray-500">Módulos</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="font-semibold text-primary-700">{course.totalLessons || 0}</div>
                      <div className="text-gray-500">Lições</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <div className="font-semibold text-primary-700">{course.totalStudents || 0}</div>
                      <div className="text-gray-500">Alunos</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-400">
                    Criado em: {new Date(course.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default TrainingCourses
