import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { UserGroupIcon, AcademicCapIcon, ChartBarIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface StudentProgress {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  moduleId: string;
  moduleName: string;
  progress: number;
  lastActivity: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedLessons: number;
  totalLessons: number;
  completedTests: number;
  totalTests: number;
  averageScore: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Course {
  id: string;
  name: string;
}

interface Module {
  id: string;
  name: string;
  courseId: string;
}

const StudentProgressPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [filteredProgressData, setFilteredProgressData] = useState<StudentProgress[]>([]);
  
  // Filtros
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Buscar dados quando o componente montar
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          // Em produção, substituir por chamadas reais à API
          // Simular busca de dados
          
          // Dados de exemplo para desenvolvimento
          const mockStudents: Student[] = [
            { id: '1', name: 'Ana Silva', email: 'ana.silva@empresa.com' },
            { id: '2', name: 'Carlos Oliveira', email: 'carlos.oliveira@empresa.com' },
            { id: '3', name: 'Mariana Costa', email: 'mariana.costa@empresa.com' },
            { id: '4', name: 'Roberto Santos', email: 'roberto.santos@empresa.com' }
          ];
          
          const mockCourses: Course[] = [
            { id: '1', name: 'Introdução à Gestão de RH' },
            { id: '2', name: 'Recrutamento e Seleção Avançado' },
            { id: '3', name: 'Liderança e Gestão de Equipes' },
            { id: '4', name: 'Desenvolvimento Organizacional' }
          ];
          
          const mockModules: Module[] = [
            { id: '1', name: 'Fundamentos de RH', courseId: '1' },
            { id: '2', name: 'Legislação Trabalhista', courseId: '1' },
            { id: '3', name: 'Técnicas de Entrevista', courseId: '2' },
            { id: '4', name: 'Avaliação de Competências', courseId: '2' },
            { id: '5', name: 'Comunicação Efetiva', courseId: '3' },
            { id: '6', name: 'Gestão de Conflitos', courseId: '3' },
            { id: '7', name: 'Cultura Organizacional', courseId: '4' },
            { id: '8', name: 'Gestão de Mudanças', courseId: '4' }
          ];
          
          const mockProgressData: StudentProgress[] = [
            {
              id: '1',
              studentId: '1',
              studentName: 'Ana Silva',
              studentEmail: 'ana.silva@empresa.com',
              courseId: '1',
              courseName: 'Introdução à Gestão de RH',
              moduleId: '1',
              moduleName: 'Fundamentos de RH',
              progress: 100,
              lastActivity: '2025-03-20T14:30:00Z',
              status: 'completed',
              completedLessons: 5,
              totalLessons: 5,
              completedTests: 2,
              totalTests: 2,
              averageScore: 92
            },
            {
              id: '2',
              studentId: '1',
              studentName: 'Ana Silva',
              studentEmail: 'ana.silva@empresa.com',
              courseId: '1',
              courseName: 'Introdução à Gestão de RH',
              moduleId: '2',
              moduleName: 'Legislação Trabalhista',
              progress: 60,
              lastActivity: '2025-03-21T10:15:00Z',
              status: 'in_progress',
              completedLessons: 3,
              totalLessons: 5,
              completedTests: 1,
              totalTests: 2,
              averageScore: 85
            },
            {
              id: '3',
              studentId: '2',
              studentName: 'Carlos Oliveira',
              studentEmail: 'carlos.oliveira@empresa.com',
              courseId: '2',
              courseName: 'Recrutamento e Seleção Avançado',
              moduleId: '3',
              moduleName: 'Técnicas de Entrevista',
              progress: 80,
              lastActivity: '2025-03-19T16:45:00Z',
              status: 'in_progress',
              completedLessons: 4,
              totalLessons: 5,
              completedTests: 1,
              totalTests: 2,
              averageScore: 78
            },
            {
              id: '4',
              studentId: '3',
              studentName: 'Mariana Costa',
              studentEmail: 'mariana.costa@empresa.com',
              courseId: '3',
              courseName: 'Liderança e Gestão de Equipes',
              moduleId: '5',
              moduleName: 'Comunicação Efetiva',
              progress: 100,
              lastActivity: '2025-03-18T09:20:00Z',
              status: 'completed',
              completedLessons: 4,
              totalLessons: 4,
              completedTests: 2,
              totalTests: 2,
              averageScore: 95
            },
            {
              id: '5',
              studentId: '3',
              studentName: 'Mariana Costa',
              studentEmail: 'mariana.costa@empresa.com',
              courseId: '3',
              courseName: 'Liderança e Gestão de Equipes',
              moduleId: '6',
              moduleName: 'Gestão de Conflitos',
              progress: 0,
              lastActivity: '',
              status: 'not_started',
              completedLessons: 0,
              totalLessons: 5,
              completedTests: 0,
              totalTests: 2,
              averageScore: 0
            },
            {
              id: '6',
              studentId: '4',
              studentName: 'Roberto Santos',
              studentEmail: 'roberto.santos@empresa.com',
              courseId: '4',
              courseName: 'Desenvolvimento Organizacional',
              moduleId: '7',
              moduleName: 'Cultura Organizacional',
              progress: 40,
              lastActivity: '2025-03-22T08:45:00Z',
              status: 'in_progress',
              completedLessons: 2,
              totalLessons: 5,
              completedTests: 0,
              totalTests: 2,
              averageScore: 0
            },
            {
              id: '7',
              studentId: '2',
              studentName: 'Carlos Oliveira',
              studentEmail: 'carlos.oliveira@empresa.com',
              courseId: '2',
              courseName: 'Recrutamento e Seleção Avançado',
              moduleId: '4',
              moduleName: 'Avaliação de Competências',
              progress: 20,
              lastActivity: '2025-03-21T13:10:00Z',
              status: 'in_progress',
              completedLessons: 1,
              totalLessons: 5,
              completedTests: 0,
              totalTests: 2,
              averageScore: 0
            }
          ];
          
          setStudents(mockStudents);
          setCourses(mockCourses);
          setModules(mockModules);
          setProgressData(mockProgressData);
          setFilteredProgressData(mockProgressData);
          setLoading(false);
        } catch (err) {
          console.error('Erro ao buscar dados de progresso:', err);
          setError('Ocorreu um erro ao buscar os dados de progresso dos alunos.');
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [status, router]);
  
  // Filtrar dados quando os filtros mudarem
  useEffect(() => {
    if (progressData.length > 0) {
      const filtered = progressData.filter(item => {
        const matchesStudent = selectedStudent ? item.studentId === selectedStudent : true;
        const matchesCourse = selectedCourse ? item.courseId === selectedCourse : true;
        const matchesModule = selectedModule ? item.moduleId === selectedModule : true;
        const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
        const matchesSearch = searchTerm 
          ? item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.moduleName.toLowerCase().includes(searchTerm.toLowerCase())
          : true;
        
        return matchesStudent && matchesCourse && matchesModule && matchesStatus && matchesSearch;
      });
      
      setFilteredProgressData(filtered);
    }
  }, [selectedStudent, selectedCourse, selectedModule, selectedStatus, searchTerm, progressData]);
  
  // Filtrar módulos quando o curso for selecionado
  const filteredModules = modules.filter(module => 
    !selectedCourse || module.courseId === selectedCourse
  );
  
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
  
  // Função para obter a cor da barra de progresso
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'Em Progresso';
      case 'not_started': return 'Não Iniciado';
      default: return status;
    }
  };
  
  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-secondary-100 text-secondary-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };
  
  // Função para obter o ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'not_started': return <XCircleIcon className="h-5 w-5 text-secondary-500" />;
      default: return null;
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
          <h1 className="text-2xl font-bold text-secondary-900">Progresso dos Alunos</h1>
          <Link
            href="/admin/training/reports"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Gerar Relatório
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                placeholder="Nome do aluno, curso ou módulo..."
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
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os alunos</option>
                {students.map((student) => (
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
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedModule(''); // Resetar o módulo quando o curso mudar
                }}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os cursos</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por módulo */}
            <div>
              <label htmlFor="moduleSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Módulo:
              </label>
              <select
                id="moduleSelect"
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                disabled={!selectedCourse}
              >
                <option value="">Todos os módulos</option>
                {filteredModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
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
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os status</option>
                <option value="completed">Concluído</option>
                <option value="in_progress">Em Progresso</option>
                <option value="not_started">Não Iniciado</option>
              </select>
            </div>
          </div>
        </div>

        {filteredProgressData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <ChartBarIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum registro de progresso encontrado</h2>
            <p className="text-secondary-500 mb-4">
              {progressData.length === 0 
                ? 'Não há registros de progresso no sistema.' 
                : 'Nenhum registro corresponde aos filtros selecionados.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStudent('');
                setSelectedCourse('');
                setSelectedModule('');
                setSelectedStatus('');
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
                      Curso / Módulo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Aulas / Testes
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Média
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Última Atividade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredProgressData.map(item => (
                    <tr key={item.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                            {item.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-secondary-900">{item.studentName}</div>
                            <div className="text-sm text-secondary-500">{item.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">{item.courseName}</div>
                        <div className="text-sm text-secondary-500">{item.moduleName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-secondary-200 rounded-full h-2.5 mr-2 flex-grow max-w-[150px]">
                            <div 
                              className={`h-2.5 rounded-full ${getProgressColor(item.progress)}`} 
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-secondary-900">{item.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">
                          <span className="font-medium">{item.completedLessons}/{item.totalLessons}</span> aulas
                        </div>
                        <div className="text-sm text-secondary-500">
                          <span className="font-medium">{item.completedTests}/{item.totalTests}</span> testes
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.averageScore > 0 ? (
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${
                              item.averageScore >= 80 ? 'text-green-600' :
                              item.averageScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {item.averageScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-secondary-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(item.status)}
                          <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {formatDate(item.lastActivity)}
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

export default StudentProgressPage;
