import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiBook, 
  FiBarChart2, 
  FiClock, 
  FiAward, 
  FiCheckCircle,
  FiUser,
  FiCalendar
} from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';

// Tipos
interface Statistics {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageScore: number;
  totalLessonsCompleted: number;
  totalTimeSpent: number; // em minutos
}

interface CourseProgress {
  id: string;
  name: string;
  description: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastAccess: string;
}

interface ProgressProps {
  initialStatistics: Statistics;
  initialCourses: CourseProgress[];
}

export default function Progress({ initialStatistics, initialCourses }: ProgressProps) {
  const [statistics, setStatistics] = useState<Statistics>(initialStatistics);
  const [courses, setCourses] = useState<CourseProgress[]>(initialCourses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar estatísticas atualizadas
  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/training/statistics');
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/treinamento/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error('Falha ao carregar estatísticas');
      }
      
      const data = await response.json();
      setStatistics(data);
      
      // Buscar cursos em progresso
      const coursesResponse = await fetch('/api/training/courses?status=in-progress');
      
      if (!coursesResponse.ok) {
        throw new Error('Falha ao carregar cursos');
      }
      
      const coursesData = await coursesResponse.json();
      setCourses(coursesData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setError('Não foi possível carregar os dados. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Formatar tempo em horas e minutos
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    } else {
      return `${mins} min`;
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <StudentLayout>
      <Head>
        <title>Meu Progresso | Portal de Treinamento</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Meu Progresso</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size={40} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        ) : (
          <>
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-primary-100 p-3 rounded-full mr-4">
                    <FiBook className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-secondary-500 text-sm">Cursos</h3>
                    <div className="flex items-end">
                      <span className="text-3xl font-bold text-secondary-900">{statistics.completedCourses}</span>
                      <span className="text-secondary-500 ml-1 mb-1">/ {statistics.totalCourses}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-secondary-100 rounded-full h-2.5">
                  <div 
                    className="bg-primary-500 h-2.5 rounded-full" 
                    style={{ 
                      width: `${statistics.totalCourses > 0 
                        ? (statistics.completedCourses / statistics.totalCourses) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
                <p className="text-secondary-500 text-sm mt-2">
                  {statistics.inProgressCourses} curso(s) em andamento
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <FiAward className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-secondary-500 text-sm">Média de Pontuação</h3>
                    <div className="flex items-end">
                      <span className="text-3xl font-bold text-secondary-900">{statistics.averageScore}</span>
                      <span className="text-secondary-500 ml-1 mb-1">/ 100</span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-secondary-100 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{ width: `${statistics.averageScore}%` }}
                  ></div>
                </div>
                <p className="text-secondary-500 text-sm mt-2">
                  Baseado em todos os testes realizados
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-3 rounded-full mr-4">
                    <FiClock className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-secondary-500 text-sm">Tempo Total de Estudo</h3>
                    <div className="text-3xl font-bold text-secondary-900">
                      {formatTime(statistics.totalTimeSpent)}
                    </div>
                  </div>
                </div>
                <p className="text-secondary-500 text-sm mt-2">
                  {statistics.totalLessonsCompleted} aulas concluídas
                </p>
              </div>
            </div>
            
            {/* Cursos em progresso */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">Cursos em Andamento</h2>
              
              {courses.length === 0 ? (
                <EmptyState
                  icon={<FiBook size={48} />}
                  title="Nenhum curso em andamento"
                  description="Você não possui cursos em andamento no momento."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {courses.map(course => (
                    <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-secondary-900">{course.name}</h3>
                            <p className="text-secondary-600 mt-1">{course.description}</p>
                          </div>
                          <Link 
                            href={`/treinamento/cursos/${course.id}`}
                            className="mt-3 md:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Continuar
                          </Link>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary-500 mb-4 gap-4">
                          <div className="flex items-center">
                            <FiCheckCircle className="mr-2" />
                            <span>{course.completedLessons} de {course.totalLessons} aulas concluídas</span>
                          </div>
                          <div className="flex items-center">
                            <FiCalendar className="mr-2" />
                            <span>Último acesso: {formatDate(course.lastAccess)}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progresso</span>
                            <span>{Math.round(course.progress)}%</span>
                          </div>
                          <div className="w-full bg-secondary-100 rounded-full h-2.5">
                            <div 
                              className="bg-primary-500 h-2.5 rounded-full" 
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Dicas para melhorar o progresso */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-800 mb-3">Dicas para melhorar seu progresso</h3>
              <ul className="space-y-2 text-blue-700">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Estabeleça uma rotina diária de estudos</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Faça anotações durante as aulas</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Revise o conteúdo antes de fazer os testes</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Pratique os conceitos aprendidos</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Verificar autenticação no servidor
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/progresso'),
        permanent: false,
      },
    };
  }
  
  try {
    // Buscar estatísticas diretamente no servidor
    const baseUrl = process.env.NEXTAUTH_URL || `https://${context.req.headers.host}`;
    const response = await fetch(`${baseUrl}/api/training/statistics`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          redirect: {
            destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/progresso'),
            permanent: false,
          },
        };
      }
      throw new Error('Falha ao carregar estatísticas');
    }
    
    const statistics = await response.json();
    
    // Buscar cursos em progresso
    const coursesResponse = await fetch(`${baseUrl}/api/training/courses?status=in-progress`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (!coursesResponse.ok) {
      throw new Error('Falha ao carregar cursos');
    }
    
    const courses = await coursesResponse.json();
    
    return {
      props: {
        initialStatistics: statistics,
        initialCourses: courses,
      },
    };
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    
    // Retornar valores padrão em caso de erro para evitar falha na renderização
    return {
      props: {
        initialStatistics: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          averageScore: 0,
          totalLessonsCompleted: 0,
          totalTimeSpent: 0
        },
        initialCourses: [],
      },
    };
  }
};
