import { useState, useEffect } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StudentLayout from '../../components/training/StudentLayout';
import CourseCard from '../../components/training/CourseCard';
import ProgressStats from '../../components/training/ProgressStats';
import { FiBookOpen, FiClock, FiAward, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  description: string;
  sectorName: string;
  moduleCount: number;
  lessonCount: number;
  progress: number;
  completed: boolean;
  imageUrl?: string;
}

export default function TrainingPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    averageScore: 0,
    totalLessonsCompleted: 0,
    totalTimeSpent: 0
  });

  // Redirecionar para a página de login se não estiver autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/treinamento/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [status, router]);

  // Buscar dados do aluno
  useEffect(() => {
    const fetchStudentData = async () => {
      if (status !== 'authenticated') return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Buscar cursos do aluno
        const coursesResponse = await fetch('/api/training/courses');
        
        if (!coursesResponse.ok) {
          throw new Error('Falha ao carregar cursos');
        }
        
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);
        
        // Filtrar cursos recentes (últimos acessados ou em progresso)
        const recent = coursesData
          .filter((course: Course) => course.progress > 0 && !course.completed)
          .sort((a: Course, b: Course) => b.progress - a.progress)
          .slice(0, 3);
        
        setRecentCourses(recent);
        
        // Buscar estatísticas do aluno
        const statsResponse = await fetch('/api/training/statistics');
        
        if (!statsResponse.ok) {
          throw new Error('Falha ao carregar estatísticas');
        }
        
        const statsData = await statsResponse.json();
        setStats(statsData);
      } catch (err) {
        console.error('Erro ao buscar dados do aluno:', err);
        setError('Ocorreu um erro ao carregar os dados. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [status]);

  // Se estiver carregando a sessão, mostre uma mensagem de carregamento
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, não renderize nada (será redirecionado pelo useEffect)
  if (status !== 'authenticated') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Portal de Treinamento | AvaliaRH</title>
        <meta name="description" content="Portal de treinamento e capacitação da AvaliaRH" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <StudentLayout>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-secondary-600">Carregando seus cursos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <FiAlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estatísticas de progresso */}
            <ProgressStats 
              totalCourses={stats.totalCourses}
              completedCourses={stats.completedCourses}
              inProgressCourses={stats.inProgressCourses}
              averageScore={stats.averageScore}
              totalLessonsCompleted={stats.totalLessonsCompleted}
              totalTimeSpent={stats.totalTimeSpent}
            />
            
            {/* Cursos em andamento */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                  <FiClock className="mr-2 text-primary-500" />
                  Continuar Aprendendo
                </h2>
                <a href="/treinamento/cursos" className="text-sm text-primary-600 hover:text-primary-700">
                  Ver todos
                </a>
              </div>
              
              {recentCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      sectorName={course.sectorName}
                      moduleCount={course.moduleCount}
                      lessonCount={course.lessonCount}
                      progress={course.progress}
                      completed={course.completed}
                      imageUrl={course.imageUrl}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiBookOpen className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900">Nenhum curso em andamento</h3>
                  <p className="mt-1 text-sm text-secondary-500">Comece um novo curso para acompanhar seu progresso aqui.</p>
                </div>
              )}
            </div>
            
            {/* Todos os cursos */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                  <FiBookOpen className="mr-2 text-primary-500" />
                  Meus Cursos
                </h2>
              </div>
              
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.slice(0, 6).map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      sectorName={course.sectorName}
                      moduleCount={course.moduleCount}
                      lessonCount={course.lessonCount}
                      progress={course.progress}
                      completed={course.completed}
                      imageUrl={course.imageUrl}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiBookOpen className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900">Nenhum curso disponível</h3>
                  <p className="mt-1 text-sm text-secondary-500">Entre em contato com seu administrador para obter acesso aos cursos.</p>
                </div>
              )}
              
              {courses.length > 6 && (
                <div className="mt-6 text-center">
                  <a 
                    href="/treinamento/cursos" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Ver todos os cursos
                  </a>
                </div>
              )}
            </div>
            
            {/* Certificados */}
            {stats.completedCourses > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                    <FiAward className="mr-2 text-primary-500" />
                    Certificados Recentes
                  </h2>
                  <a href="/treinamento/certificados" className="text-sm text-primary-600 hover:text-primary-700">
                    Ver todos
                  </a>
                </div>
                
                <div className="text-center py-8">
                  <FiAward className="mx-auto h-12 w-12 text-secondary-400" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900">Certificados disponíveis</h3>
                  <p className="mt-1 text-sm text-secondary-500">Você tem {stats.completedCourses} certificados disponíveis.</p>
                  <a 
                    href="/treinamento/certificados" 
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100"
                  >
                    Ver meus certificados
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </StudentLayout>
    </>
  );
}

// Verificar autenticação no servidor
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  // Se não estiver autenticado, redirecionar para a página de login
  if (!session) {
    return {
      redirect: {
        destination: `/treinamento/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }
  
  return {
    props: { session }
  };
}