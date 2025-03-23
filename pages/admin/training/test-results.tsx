import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { CheckIcon, XMarkIcon, EyeIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface TestResult {
  id: string;
  studentId: string;
  testId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  completedAt: string;
  status: 'completed' | 'in_progress' | 'failed';
  student: {
    id: string;
    name: string;
    email: string;
  };
  test: {
    id: string;
    title: string;
    courseId: string;
    course: {
      name: string;
    };
  };
}

interface FilterOptions {
  studentId: string;
  testId: string;
  courseId: string;
  status: string;
  minScore: number;
  maxScore: number;
}

interface Student {
  id: string;
  name: string;
}

interface Test {
  id: string;
  title: string;
  courseId: string;
}

interface Course {
  id: string;
  name: string;
}

const TestResultsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [filters, setFilters] = useState<FilterOptions>({
    studentId: '',
    testId: '',
    courseId: '',
    status: '',
    minScore: 0,
    maxScore: 100
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);

  // Buscar dados quando o componente montar
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar resultados de testes
      axios.get('/api/admin/training/test-results')
        .then(response => {
          const resultsData = Array.isArray(response.data) ? response.data : [];
          setTestResults(resultsData);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar resultados de testes:', err);
          setError('Ocorreu um erro ao buscar os resultados de testes.');
          setLoading(false);
        });
      
      // Buscar alunos
      axios.get('/api/admin/training/students')
        .then(response => {
          const studentsData = Array.isArray(response.data) ? response.data : [];
          setStudents(studentsData);
        })
        .catch(err => {
          console.error('Erro ao buscar alunos:', err);
          setError('Ocorreu um erro ao buscar os alunos.');
        });
      
      // Buscar testes
      axios.get('/api/admin/training/tests')
        .then(response => {
          const testsData = Array.isArray(response.data) ? response.data : [];
          setTests(testsData);
        })
        .catch(err => {
          console.error('Erro ao buscar testes:', err);
          setError('Ocorreu um erro ao buscar os testes.');
        });
      
      // Buscar cursos
      axios.get('/api/admin/training/courses')
        .then(response => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError('Ocorreu um erro ao buscar os cursos.');
        });
    }
  }, [status, router]);

  // Filtrar testes quando o curso selecionado mudar
  useEffect(() => {
    if (filters.courseId) {
      const filtered = tests.filter(test => test.courseId === filters.courseId);
      setFilteredTests(filtered);
      
      // Resetar o teste selecionado se não estiver no curso atual
      if (filters.testId) {
        const testExists = filtered.some(test => test.id === filters.testId);
        if (!testExists) {
          setFilters(prev => ({ ...prev, testId: '' }));
        }
      }
    } else {
      setFilteredTests(tests);
    }
  }, [filters.courseId, tests, filters.testId]);

  // Aplicar filtros aos resultados de testes
  const filteredResults = testResults.filter(result => {
    const matchesStudent = filters.studentId ? result.studentId === filters.studentId : true;
    const matchesTest = filters.testId ? result.testId === filters.testId : true;
    const matchesCourse = filters.courseId ? result.test.courseId === filters.courseId : true;
    const matchesStatus = filters.status ? result.status === filters.status : true;
    const matchesScore = result.score >= filters.minScore && result.score <= filters.maxScore;
    const matchesSearch = searchTerm 
      ? result.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        result.test.title.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return matchesStudent && matchesTest && matchesCourse && matchesStatus && matchesScore && matchesSearch;
  });

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'in_progress':
        return 'Em Progresso';
      case 'failed':
        return 'Reprovado';
      default:
        return 'Desconhecido';
    }
  };

  // Função para obter o ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <ArrowPathIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  // Função para calcular a porcentagem de acertos
  const calculatePercentage = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  // Função para obter a cor da barra de progresso com base na pontuação
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
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
          <h1 className="text-2xl font-bold text-secondary-900">Resultados de Testes</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                placeholder="Nome do aluno ou título do teste..."
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Filtro por aluno */}
            <div>
              <label htmlFor="studentSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Aluno:
              </label>
              <select
                id="studentSelect"
                value={filters.studentId}
                onChange={(e) => setFilters(prev => ({ ...prev, studentId: e.target.value }))}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os alunos</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por curso */}
            <div>
              <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Curso:
              </label>
              <select
                id="courseSelect"
                value={filters.courseId}
                onChange={(e) => setFilters(prev => ({ ...prev, courseId: e.target.value }))}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os cursos</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por teste */}
            <div>
              <label htmlFor="testSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Teste:
              </label>
              <select
                id="testSelect"
                value={filters.testId}
                onChange={(e) => setFilters(prev => ({ ...prev, testId: e.target.value }))}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={!filters.courseId}
              >
                <option value="">Todos os testes</option>
                {filteredTests.map(test => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por status */}
            <div>
              <label htmlFor="statusSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Status:
              </label>
              <select
                id="statusSelect"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os status</option>
                <option value="completed">Concluído</option>
                <option value="in_progress">Em Progresso</option>
                <option value="failed">Reprovado</option>
              </select>
            </div>
            
            {/* Filtro por pontuação */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Pontuação:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => setFilters(prev => ({ ...prev, minScore: parseInt(e.target.value) || 0 }))}
                  className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-secondary-500">a</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxScore}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 100 }))}
                  className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({
                  studentId: '',
                  testId: '',
                  courseId: '',
                  status: '',
                  minScore: 0,
                  maxScore: 100
                });
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum resultado encontrado</h2>
            <p className="text-secondary-500 mb-4">
              {testResults.length === 0 
                ? 'Não há resultados de testes registrados no sistema.' 
                : 'Nenhum resultado corresponde aos filtros selecionados.'}
            </p>
            <button
              onClick={() => {
                setFilters({
                  studentId: '',
                  testId: '',
                  courseId: '',
                  status: '',
                  minScore: 0,
                  maxScore: 100
                });
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Aluno
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Teste / Curso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Pontuação
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredResults.map(result => (
                    <tr key={result.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                            {result.student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-secondary-900">{result.student.name}</div>
                            <div className="text-sm text-secondary-500">{result.student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">{result.test.title}</div>
                        <div className="text-sm text-secondary-500">{result.test.course.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900 mb-1">
                          {result.score}/100 ({result.correctAnswers}/{result.totalQuestions})
                        </div>
                        <div className="w-full bg-secondary-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getScoreColor(result.score)}`} 
                            style={{ width: `${result.score}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(result.status)}
                          <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                            {getStatusText(result.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {formatDate(result.completedAt || result.startedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => router.push(`/admin/training/test-results/${result.id}`)}
                          className="text-primary-600 hover:text-primary-800 mr-3"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TestResultsPage;
