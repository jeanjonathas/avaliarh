import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  FiChevronRight, 
  FiChevronLeft, 
  FiCheckCircle, 
  FiClock, 
  FiBarChart2, 
  FiArrowLeft,
  FiArrowRight,
  FiMaximize,
  FiMinimize,
  FiPlayCircle,
  FiPauseCircle,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';

// Tipos
interface Lesson {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  moduleName: string;
  courseId: string;
  courseName: string;
  type: 'VIDEO' | 'AUDIO' | 'SLIDES' | 'TEXT';
  content: string;
  duration: number; // em minutos
  order: number;
  finalTestId?: string;
  nextLessonId?: string;
  prevLessonId?: string;
  completed: boolean;
  timeSpent: number; // em segundos
}

interface LessonViewProps {
  initialLesson: Lesson | null;
  error?: string;
}

export default function LessonView({ initialLesson, error: initialError }: LessonViewProps) {
  const router = useRouter();
  const { id } = router.query;
  const [lesson, setLesson] = useState<Lesson | null>(initialLesson);
  const [loading, setLoading] = useState(!initialLesson);
  const [error, setError] = useState<string | null>(initialError || null);
  const [timeSpent, setTimeSpent] = useState(initialLesson?.timeSpent || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMarkAsCompleted, setShowMarkAsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgressSaving = useRef<boolean>(false);
  const saveProgressErrorCount = useRef<number>(0);
  const lastSavedTimeSpent = useRef<number>(initialLesson?.timeSpent || 0);

  // Configurar o botão de marcar como concluído
  useEffect(() => {
    if (!lesson || lesson.completed) return;
    
    // Mostrar botão de marcar como concluída após 70% do tempo estimado
    const minTimeRequired = lesson.duration * 60 * 0.7; // 70% do tempo em segundos
    if (timeSpent >= minTimeRequired) {
      setShowMarkAsCompleted(true);
    } else {
      // Programar quando o botão deve aparecer
      const remainingTime = minTimeRequired - timeSpent;
      const timerId = setTimeout(() => {
        setShowMarkAsCompleted(true);
      }, remainingTime * 1000);
      
      return () => clearTimeout(timerId);
    }
  }, [lesson, timeSpent]);

  // Registrar tempo gasto na aula
  useEffect(() => {
    if (!lesson || lesson.completed || !id) return;

    // Iniciar o timer para registrar o tempo gasto
    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        // Verificar se o usuário está ativo
        const now = Date.now();
        const inactiveTime = now - lastActivityRef.current;
        
        // Se inativo por mais de 2 minutos, não contar o tempo
        if (inactiveTime < 2 * 60 * 1000) {
          setTimeSpent(prev => prev + 1);
        }
      }, 1000);
    };

    // Função para salvar o progresso
    const saveProgress = async () => {
      if (!id || isProgressSaving.current) return;
      
      // Verificar se o tempo mudou desde o último salvamento
      // Só salvar se o tempo aumentou pelo menos 30 segundos
      if (timeSpent < lastSavedTimeSpent.current + 30) {
        // Agendar próxima verificação
        if (progressSaveTimeoutRef.current) {
          clearTimeout(progressSaveTimeoutRef.current);
        }
        progressSaveTimeoutRef.current = setTimeout(saveProgress, 60000); // Verificar a cada 60 segundos
        return;
      }
      
      isProgressSaving.current = true;
      
      try {
        const response = await fetch(`/api/training/lessons/${id}/progress`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeSpent })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erro ao salvar progresso:', errorData);
          
          // Se o erro for de autenticação e persistir, redirecionar para login
          if (response.status === 401) {
            saveProgressErrorCount.current += 1;
            
            // Se tivermos 3 erros de autenticação consecutivos, redirecionar
            if (saveProgressErrorCount.current >= 3) {
              toast.error('Sua sessão expirou. Redirecionando para a página de login...');
              setTimeout(() => {
                window.location.href = '/treinamento/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
              }, 2000);
              return;
            }
          }
        } else {
          // Resetar contador de erros se a requisição for bem-sucedida
          saveProgressErrorCount.current = 0;
          lastSavedTimeSpent.current = timeSpent;
          console.log(`Progresso salvo: ${timeSpent} segundos`);
        }
      } catch (error) {
        console.error('Erro ao salvar progresso:', error);
      } finally {
        isProgressSaving.current = false;
        
        // Agendar próxima atualização apenas se não houver muitos erros consecutivos
        if (saveProgressErrorCount.current < 3) {
          if (progressSaveTimeoutRef.current) {
            clearTimeout(progressSaveTimeoutRef.current);
          }
          
          // Aumentar o intervalo entre as requisições para 60 segundos
          progressSaveTimeoutRef.current = setTimeout(saveProgress, 60000);
        }
      }
    };

    // Atualizar timestamp de última atividade quando houver interação
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Adicionar event listeners para detectar atividade
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    // Iniciar o timer e salvar progresso inicial
    startTimer();
    updateActivity();
    
    // Iniciar o primeiro salvamento após 30 segundos
    progressSaveTimeoutRef.current = setTimeout(saveProgress, 30000);

    // Limpar timers e event listeners
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressSaveTimeoutRef.current) clearTimeout(progressSaveTimeoutRef.current);
      
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      
      // Salvar progresso ao sair da página
      if (id && !isProgressSaving.current && saveProgressErrorCount.current < 3 && timeSpent > lastSavedTimeSpent.current + 30) {
        fetch(`/api/training/lessons/${id}/progress`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeSpent })
        }).catch(error => {
          console.error('Erro ao salvar progresso final:', error);
        });
      }
    };
  }, [id, lesson, timeSpent]);

  // Marcar aula como concluída
  const markAsCompleted = async () => {
    if (!lesson || !id || isCompleting) return;
    
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/training/lessons/${id}/progress`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeSpent, completed: true })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Se o erro for de autenticação, redirecionar para login
        if (response.status === 401) {
          toast.error('Sua sessão expirou. Por favor, faça login novamente.');
          setTimeout(() => {
            window.location.href = '/treinamento/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          }, 2000);
          return;
        }
        
        throw new Error(errorData.message || 'Falha ao marcar aula como concluída');
      }
      
      // Atualizar estado local
      setLesson(prev => prev ? { ...prev, completed: true } : null);
      toast.success('Aula marcada como concluída!');
      lastSavedTimeSpent.current = timeSpent;
      
      // Verificar se há teste após a aula
      if (lesson.finalTestId) {
        setShowTestPrompt(true);
      }
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível marcar aula como concluída. Por favor, tente novamente.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Navegar para o teste
  const navigateToTest = () => {
    if (lesson?.finalTestId) {
      router.push(`/treinamento/testes/${lesson.finalTestId}`);
    }
  };

  // Navegar para a próxima ou anterior aula
  const navigateToLesson = (lessonId: string) => {
    router.push(`/treinamento/aulas/${lessonId}`);
  };

  // Alternar modo de tela cheia
  const toggleFullscreen = () => {
    if (!contentRef.current) return;
    
    if (!isFullscreen) {
      if (contentRef.current.requestFullscreen) {
        contentRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };

  // Controles de mídia
  const togglePlay = () => {
    if (lesson?.type === 'VIDEO' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (lesson?.type === 'AUDIO' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (lesson?.type === 'VIDEO' && videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    } else if (lesson?.type === 'AUDIO' && audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Renderizar conteúdo baseado no tipo de aula
  const renderLessonContent = () => {
    if (!lesson) return null;
    
    switch (lesson.type) {
      case 'VIDEO':
        return (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={lesson.content}
              className="w-full h-full"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onVolumeChange={() => setIsMuted(videoRef.current?.muted || false)}
            />
          </div>
        );
      
      case 'AUDIO':
        return (
          <div className="bg-secondary-100 p-6 rounded-lg">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                <FiVolume2 className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center mb-4">{lesson.name}</h3>
            <audio
              ref={audioRef}
              src={lesson.content}
              className="w-full"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onVolumeChange={() => setIsMuted(audioRef.current?.muted || false)}
            />
          </div>
        );
      
      case 'SLIDES':
        return (
          <div className="bg-white rounded-lg overflow-hidden shadow-md">
            <iframe 
              src={lesson.content} 
              className="w-full h-[600px]" 
              title={lesson.name}
              allowFullScreen
            />
          </div>
        );
      
      case 'TEXT':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          </div>
        );
      
      default:
        return (
          <div className="bg-secondary-50 p-6 rounded-lg text-center">
            <p className="text-secondary-500">Tipo de conteúdo não suportado.</p>
          </div>
        );
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

  // Renderizar quando não há aula
  if (!lesson) {
    return (
      <StudentLayout>
        <EmptyState 
          title="Aula não encontrada"
          description="A aula que você está procurando não existe ou você não tem acesso a ela."
          icon={<FiClock className="w-12 h-12 text-secondary-400" />}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <Head>
        <title>{lesson.name} | AvaliaRH Treinamento</title>
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
            <li>
              <div className="flex items-center">
                <FiChevronRight className="w-4 h-4 text-secondary-400" />
                <Link href={`/treinamento/cursos/${lesson.courseId}`} className="ml-1 text-sm text-secondary-500 hover:text-secondary-700 md:ml-2">
                  {lesson.courseName}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <FiChevronRight className="w-4 h-4 text-secondary-400" />
                <span className="ml-1 text-sm font-medium text-secondary-700 md:ml-2">
                  {lesson.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Cabeçalho da aula */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 mb-1">{lesson.name}</h1>
            <p className="text-secondary-600 mb-2">{lesson.description}</p>
            <p className="text-sm text-secondary-500">
              Módulo: {lesson.moduleName} • Duração estimada: {lesson.duration} min
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <div className="flex items-center mr-4">
              <FiClock className="text-secondary-500 mr-1" />
              <span className="text-sm text-secondary-600">
                Tempo: {formatTime(timeSpent)}
              </span>
            </div>
            
            {lesson.completed ? (
              <div className="flex items-center text-green-600">
                <FiCheckCircle className="mr-1" />
                <span className="text-sm font-medium">Concluída</span>
              </div>
            ) : showMarkAsCompleted ? (
              <button
                onClick={markAsCompleted}
                disabled={isCompleting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition duration-200 flex items-center"
              >
                {isCompleting ? (
                  <>
                    <LoadingSpinner size={4} color="white" className="mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="mr-2" />
                    Marcar como concluída
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center text-yellow-600">
                <FiClock className="mr-1" />
                <span className="text-sm font-medium">Em andamento</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo da aula */}
      <div className="mb-6" ref={contentRef}>
        {renderLessonContent()}
      </div>

      {/* Navegação entre aulas */}
      <div className="flex justify-between">
        <div>
          {lesson.prevLessonId && (
            <button
              onClick={() => navigateToLesson(lesson.prevLessonId!)}
              className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 text-sm font-medium rounded-md hover:bg-secondary-50 transition duration-200 flex items-center"
            >
              <FiChevronLeft className="mr-2" />
              Aula anterior
            </button>
          )}
        </div>
        
        <div>
          {lesson.nextLessonId && (
            <button
              onClick={() => navigateToLesson(lesson.nextLessonId!)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition duration-200 flex items-center"
            >
              Próxima aula
              <FiChevronRight className="ml-2" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de teste */}
      {showTestPrompt && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-secondary-900 mb-4">Teste disponível</h3>
            <p className="text-secondary-600 mb-6">
              Parabéns por concluir esta aula! Há um teste disponível para avaliar seu conhecimento.
              Deseja realizá-lo agora?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowTestPrompt(false)}
                className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50"
              >
                Mais tarde
              </button>
              <button
                onClick={navigateToTest}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Fazer o teste
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.params;
  
  // Verificar autenticação no servidor
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: '/treinamento/login?callbackUrl=' + encodeURIComponent(`/treinamento/aulas/${id}`),
        permanent: false,
      },
    };
  }
  
  try {
    // Buscar detalhes da aula diretamente no servidor
    const baseUrl = process.env.NEXTAUTH_URL || `https://${context.req.headers.host}`;
    const response = await fetch(`${baseUrl}/api/training/lessons/${id}`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          redirect: {
            destination: '/treinamento/login?callbackUrl=' + encodeURIComponent(`/treinamento/aulas/${id}`),
            permanent: false,
          },
        };
      }
      throw new Error('Falha ao carregar dados da aula');
    }
    
    const lessonData = await response.json();
    
    return {
      props: {
        initialLesson: lessonData,
      },
    };
  } catch (error) {
    console.error('Erro ao carregar dados da aula:', error);
    return {
      props: {
        initialLesson: null,
        error: 'Não foi possível carregar os dados da aula. Por favor, tente novamente mais tarde.',
      },
    };
  }
}
