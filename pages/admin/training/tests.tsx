import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, DocumentTextIcon, ClipboardIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Test {
  id: string;
  title: string;
  description: string;
  moduleId: string | null;
  courseId: string;
  duration: number; // em minutos
  passingScore: number; // pontuação mínima para aprovação (%)
  questionCount: number;
  attemptsAllowed: number;
  isActive: boolean;
  module?: {
    name: string;
  };
  course?: {
    name: string;
  };
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
}

const TestsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'module' | 'course'>('all');

  // Buscar cursos e testes
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todos os cursos
      axios.get('/api/admin/training/courses')
        .then(response => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
          
          // Se houver um curso na URL, selecione-o
          const courseId = router.query.courseId as string;
          if (courseId) {
            setSelectedCourseId(courseId);
            setFilterType('course');
            fetchTestsByCourse(courseId);
          } else {
            // Buscar todos os testes
            fetchAllTests();
          }
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os cursos.');
          setLoading(false);
        });
    }
  }, [status, router]);

  const fetchAllTests = () => {
    setLoading(true);
    axios.get('/api/admin/training/tests')
      .then(response => {
        const testsData = Array.isArray(response.data) ? response.data : [];
        setTests(testsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar testes:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os testes.');
        setLoading(false);
      });
  };

  const fetchTestsByCourse = (courseId: string) => {
    setLoading(true);
    axios.get(`/api/admin/training/tests?courseId=${courseId}`)
      .then(response => {
        const testsData = Array.isArray(response.data) ? response.data : [];
        setTests(testsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar testes do curso:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao buscar os testes do curso.');
        setLoading(false);
      });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilterType(value as 'all' | 'module' | 'course');
    
    if (value === 'all') {
      setSelectedCourseId('');
      fetchAllTests();
      
      // Atualizar a URL removendo o parâmetro courseId
      router.push('/admin/training/tests', undefined, { shallow: true });
    }
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    
    if (courseId) {
      fetchTestsByCourse(courseId);
      
      // Atualizar a URL com o ID do curso selecionado
      router.push({
        pathname: '/admin/training/tests',
        query: { courseId }
      }, undefined, { shallow: true });
    } else {
      fetchAllTests();
      
      // Atualizar a URL removendo o parâmetro courseId
      router.push('/admin/training/tests', undefined, { shallow: true });
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
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Testes</h1>
          <Link
            href="/admin/training/tests/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Novo Teste
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filterType" className="block text-sm font-medium text-secondary-700 mb-2">
                Filtrar por:
              </label>
              <select
                id="filterType"
                value={filterType}
                onChange={handleFilterChange}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">Todos os testes</option>
                <option value="course">Testes por curso</option>
              </select>
            </div>
            
            {filterType === 'course' && (
              <div>
                <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                  Selecione um curso:
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
            )}
          </div>
        </div>

        {tests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum teste encontrado</h2>
            <p className="text-secondary-500 mb-4">
              {filterType === 'course' && selectedCourseId 
                ? 'Este curso ainda não possui testes.' 
                : 'Não há testes cadastrados no sistema.'}
            </p>
            <Link
              href="/admin/training/tests/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
            >
              Criar Novo Teste
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tests.map(test => (
              <div 
                key={test.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-semibold text-secondary-800 line-clamp-1">{test.title}</h2>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      test.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-secondary-100 text-secondary-800'
                    }`}>
                      {test.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  
                  <p className="text-secondary-600 mb-4 line-clamp-2">{test.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div className="flex items-center">
                      <ClipboardIcon className="h-5 w-5 text-secondary-500 mr-2" />
                      <span className="text-secondary-600">{test.questionCount} questões</span>
                    </div>
                    <div className="flex items-center">
                      <AcademicCapIcon className="h-5 w-5 text-secondary-500 mr-2" />
                      <span className="text-secondary-600">Nota mínima: {test.passingScore}%</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-secondary-600">Duração: {formatDuration(test.duration)}</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-secondary-600">Tentativas: {test.attemptsAllowed}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-secondary-200">
                    <div className="text-sm text-secondary-600 mb-2">
                      {test.course?.name && (
                        <div className="mb-1">
                          <span className="font-medium">Curso:</span> {test.course.name}
                        </div>
                      )}
                      {test.module?.name && (
                        <div>
                          <span className="font-medium">Módulo:</span> {test.module.name}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between mt-2">
                      <Link
                        href={`/admin/training/tests/${test.id}/questions`}
                        className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200 text-sm"
                      >
                        Questões
                      </Link>
                      <Link
                        href={`/admin/training/tests/${test.id}`}
                        className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 text-sm"
                      >
                        Gerenciar
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TestsPage;
