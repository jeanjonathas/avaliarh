import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { useSession } from 'next-auth/react';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FiChevronRight, 
  FiChevronDown, 
  FiPlay, 
  FiFileText, 
  FiVideo, 
  FiHeadphones, 
  FiFile, 
  FiCheckCircle,
  FiClock,
  FiBarChart2,
  FiAward,
  FiLock
} from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';

// Tipos
interface Course {
  id: string;
  name: string;
  description: string;
  sectorName: string;
  finalTestId?: string;
  finalTestCompleted?: boolean;
  finalTestScore?: number;
  progress: number;
  completed: boolean;
  imageUrl?: string;
  enrollmentDate: string;
  completionDate?: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  order: number;
  finalTestId?: string;
  finalTestCompleted?: boolean;
  finalTestScore?: number;
  progress: number;
  completed: boolean;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  name: string;
  description: string;
  order: number;
  type: 'VIDEO' | 'AUDIO' | 'SLIDES' | 'TEXT';
  duration: number; // em minutos
  finalTestId?: string;
  finalTestCompleted?: boolean;
  finalTestScore?: number;
  completed: boolean;
  locked: boolean;
}

export default function CourseDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do curso
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return;

      try {
        if (!session) {
          router.push('/');
          return;
        }

        // Registrar acesso
        await fetch('/api/training/access-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            courseId: id as string,
            timestamp: new Date().toISOString() 
          })
        });

        // Buscar detalhes do curso
        const courseResponse = await fetch(`/api/training/courses/${id}`);
        if (!courseResponse.ok) throw new Error('Falha ao carregar dados do curso');
        const courseData = await courseResponse.json();
        
        // Expandir todos os módulos por padrão
        const initialExpandedState = {};
        courseData.modules.forEach(module => {
          initialExpandedState[module.id] = true;
        });
        
        setCourse(courseData);
        setModules(courseData.modules);
        setExpandedModules(initialExpandedState);
      } catch (err) {
        console.error('Erro ao carregar dados do curso:', err);
        setError('Não foi possível carregar os dados do curso. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id, router, session]);

  // Alternar expansão do módulo
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Navegar para uma aula
  const navigateToLesson = (lessonId: string, locked: boolean) => {
    if (locked) return; // Não permitir acesso a aulas bloqueadas
    
    // Usar window.location para garantir que a página seja recarregada completamente
    window.location.href = `/treinamento/aulas/${lessonId}`;
  };

  // Navegar para um teste
  const navigateToTest = (testId: string) => {
    router.push(`/treinamento/testes/${testId}`);
  };

  // Renderizar ícone baseado no tipo de aula
  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <FiVideo className="text-primary-500" />;
      case 'AUDIO':
        return <FiHeadphones className="text-primary-500" />;
      case 'SLIDES':
        return <FiFile className="text-primary-500" />;
      case 'TEXT':
        return <FiFileText className="text-primary-500" />;
      default:
        return <FiFileText className="text-primary-500" />;
    }
  };

  // Formatar duração
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  };

  // Renderizar estado de carregamento
  if (loading) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size={12} />
        </div>
      </StudentLayout>
    );
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <StudentLayout>
        <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-6">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </StudentLayout>
    );
  }

  // Renderizar quando não há curso
  if (!course) {
    return (
      <StudentLayout>
        <EmptyState 
          title="Curso não encontrado"
          description="O curso que você está procurando não existe ou você não tem acesso a ele."
          icon={<FiFileText className="w-12 h-12 text-secondary-400" />}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <Head>
        <title>{course.name} | AvaliaRH Treinamento</title>
      </Head>

      {/* Navegação */}
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/treinamento" className="text-sm text-secondary-500 hover:text-secondary-700">
                Início
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <FiChevronRight className="w-4 h-4 text-secondary-400" />
                <Link href="/treinamento/cursos" className="ml-1 text-sm text-secondary-500 hover:text-secondary-700 md:ml-2">
                  Meus Cursos
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <FiChevronRight className="w-4 h-4 text-secondary-400" />
                <span className="ml-1 text-sm font-medium text-secondary-700 md:ml-2">
                  {course.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Cabeçalho do curso */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="h-48 bg-primary-100 relative">
          {course.imageUrl ? (
            <div className="relative w-full h-full">
              <Image
                src={course.imageUrl}
                alt={course.name}
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600">
              <h1 className="text-3xl font-bold text-white">{course.name}</h1>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="mb-4 md:mb-0 md:mr-8 flex-1">
              <h1 className="text-2xl font-bold text-secondary-900 mb-2">{course.name}</h1>
              <p className="text-secondary-600 mb-4">{course.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700">
                  {course.sectorName}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                  course.completed 
                    ? 'bg-green-50 text-green-700' 
                    : course.progress > 0 
                      ? 'bg-yellow-50 text-yellow-700' 
                      : 'bg-secondary-50 text-secondary-700'
                }`}>
                  {course.completed 
                    ? 'Concluído' 
                    : course.progress > 0 
                      ? 'Em andamento' 
                      : 'Não iniciado'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-secondary-500">
                <div className="flex items-center">
                  <FiClock className="mr-1" />
                  <span>Matriculado em {new Date(course.enrollmentDate).toLocaleDateString()}</span>
                </div>
                {course.completionDate && (
                  <div className="flex items-center">
                    <FiCheckCircle className="mr-1 text-green-500" />
                    <span>Concluído em {new Date(course.completionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <div className="bg-secondary-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-secondary-900 mb-3">Progresso do curso</h3>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-secondary-600">Progresso</span>
                    <span className="text-xs font-medium text-secondary-900">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div
                      className={`${course.completed ? 'bg-green-500' : 'bg-primary-600'} h-2 rounded-full`}
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                {course.finalTestId && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-secondary-900 mb-2">Teste Final</h4>
                    {course.finalTestCompleted ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary-600">Pontuação</span>
                        <span className="text-xs font-medium text-green-600">{course.finalTestScore}%</span>
                      </div>
                    ) : course.progress === 100 ? (
                      <button
                        onClick={() => navigateToTest(course.finalTestId!)}
                        className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition duration-200"
                      >
                        Realizar teste final
                      </button>
                    ) : (
                      <div className="flex items-center text-xs text-secondary-500">
                        <FiLock className="mr-1" />
                        <span>Complete todas as aulas para desbloquear</span>
                      </div>
                    )}
                  </div>
                )}
                
                {course.completed && (
                  <Link href={`/treinamento/certificados/${course.id}`}>
                    <button className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition duration-200 flex items-center justify-center">
                      <FiAward className="mr-2" />
                      Ver certificado
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de módulos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">Conteúdo do curso</h2>
        </div>
        
        {modules.length > 0 ? (
          <div className="divide-y divide-secondary-200">
            {modules.map((module) => (
              <div key={module.id} className="bg-white">
                {/* Cabeçalho do módulo */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary-50"
                  onClick={() => toggleModule(module.id)}
                >
                  <div className="flex items-center">
                    {expandedModules[module.id] ? (
                      <FiChevronDown className="w-5 h-5 text-secondary-500 mr-2" />
                    ) : (
                      <FiChevronRight className="w-5 h-5 text-secondary-500 mr-2" />
                    )}
                    <div>
                      <h3 className="text-md font-medium text-secondary-900">{module.name}</h3>
                      <p className="text-sm text-secondary-500">
                        {module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'} • 
                        {module.completed ? (
                          <span className="text-green-600 ml-1">Concluído</span>
                        ) : (
                          <span className="ml-1">{module.progress}% completo</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Barra de progresso do módulo */}
                  <div className="w-24 hidden sm:block">
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div
                        className={`${module.completed ? 'bg-green-500' : 'bg-primary-600'} h-2 rounded-full`}
                        style={{ width: `${module.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Lista de aulas do módulo */}
                {expandedModules[module.id] && (
                  <div className="pl-11 pr-4 pb-4 divide-y divide-secondary-100">
                    {module.lessons.map((lesson) => (
                      <div 
                        key={lesson.id}
                        className={`py-3 flex items-center justify-between ${
                          lesson.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-secondary-50'
                        }`}
                        onClick={() => navigateToLesson(lesson.id, lesson.locked)}
                      >
                        <div className="flex items-center">
                          <div className="mr-3">
                            {lesson.completed ? (
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                <FiCheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                            ) : lesson.locked ? (
                              <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center">
                                <FiLock className="w-4 h-4 text-secondary-500" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                                {getLessonIcon(lesson.type)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-secondary-900">{lesson.name}</h4>
                            <div className="flex items-center text-xs text-secondary-500">
                              <span className="mr-2">{formatDuration(lesson.duration)}</span>
                              {lesson.finalTestId && (
                                <span className="flex items-center">
                                  <FiBarChart2 className="mr-1" />
                                  Inclui teste
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {!lesson.locked && (
                          <button 
                            className={`p-2 rounded-full ${
                              lesson.completed 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-primary-600 hover:bg-primary-50'
                            }`}
                            title={lesson.completed ? 'Aula concluída' : 'Iniciar aula'}
                          >
                            {lesson.completed ? (
                              <FiCheckCircle className="w-5 h-5" />
                            ) : (
                              <FiPlay className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {/* Teste final do módulo */}
                    {module.finalTestId && (
                      <div className="py-3">
                        <div className={`flex items-center justify-between ${
                          module.progress < 100 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-secondary-50'
                        }`}
                        onClick={() => module.progress === 100 && navigateToTest(module.finalTestId!)}>
                          <div className="flex items-center">
                            <div className="mr-3">
                              {module.finalTestCompleted ? (
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                  <FiCheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                              ) : module.progress < 100 ? (
                                <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center">
                                  <FiLock className="w-4 h-4 text-secondary-500" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                                  <FiBarChart2 className="w-4 h-4 text-yellow-600" />
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-secondary-900">Teste final do módulo</h4>
                              {module.finalTestCompleted ? (
                                <span className="text-xs text-green-600">Concluído - Pontuação: {module.finalTestScore}%</span>
                              ) : module.progress < 100 ? (
                                <span className="text-xs text-secondary-500">Complete todas as aulas para desbloquear</span>
                              ) : (
                                <span className="text-xs text-secondary-500">Avalie seu conhecimento</span>
                              )}
                            </div>
                          </div>
                          
                          {module.progress === 100 && !module.finalTestCompleted && (
                            <button 
                              className="p-2 rounded-full text-primary-600 hover:bg-primary-50"
                              title="Iniciar teste"
                            >
                              <FiPlay className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState 
              title="Nenhum módulo encontrado"
              description="Este curso ainda não possui módulos disponíveis."
              icon={<FiFileText className="w-12 h-12 text-secondary-400" />}
            />
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

// Garantir que o usuário esteja autenticado
export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  return {
    props: {}
  };
}
