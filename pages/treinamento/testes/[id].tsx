import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { useSession } from 'next-auth/react';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiChevronRight, 
  FiChevronLeft, 
  FiCheck, 
  FiAlertTriangle,
  FiClock
} from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import TestQuestion, { Question } from '../../../components/training/TestQuestion';
import TestTimer from '../../../components/training/TestTimer';
import TestProgress from '../../../components/training/TestProgress';
import TestResults from '../../../components/training/TestResults';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';

// Tipos
interface Test {
  id: string;
  title: string;
  description: string;
  type: 'COURSE' | 'MODULE' | 'LESSON';
  courseId?: string;
  courseName?: string;
  moduleId?: string;
  moduleName?: string;
  lessonId?: string;
  lessonName?: string;
  timeLimit?: number; // em minutos
  passingScore: number; // porcentagem
  questions: Question[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowReview: boolean;
  previousAttempts: number;
  maxAttempts?: number;
  bestScore?: number;
}

export default function TestView() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [answeredIndices, setAnsweredIndices] = useState<number[]>([]);
  const [testState, setTestState] = useState<'loading' | 'in_progress' | 'submitting' | 'completed'>('loading');
  const [results, setResults] = useState<{
    score: number;
    correctAnswers: number;
    incorrectAnswers: number;
    correctOptionsByQuestion: Record<string, string[]>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  // Buscar dados do teste
  useEffect(() => {
    const fetchTestData = async () => {
      if (!id) return;

      try {
        if (!session) {
          router.push('/');
          return;
        }

        // Buscar detalhes do teste
        const testResponse = await fetch(`/api/training/tests/${id}`);
        if (!testResponse.ok) throw new Error('Falha ao carregar dados do teste');
        const testData = await testResponse.json();
        
        // Processar questões (embaralhar se necessário)
        let processedQuestions = [...testData.questions];
        
        if (testData.shuffleQuestions) {
          processedQuestions = shuffleArray(processedQuestions);
        }
        
        if (testData.shuffleOptions) {
          processedQuestions = processedQuestions.map(question => ({
            ...question,
            options: shuffleArray(question.options)
          }));
        }
        
        setTest(testData);
        setQuestions(processedQuestions);
        
        // Inicializar objeto de respostas
        const initialAnswers = {};
        processedQuestions.forEach(q => {
          initialAnswers[q.id] = [];
        });
        setAnswers(initialAnswers);
        
        setTestState('in_progress');
      } catch (err) {
        console.error('Erro ao carregar dados do teste:', err);
        setError('Não foi possível carregar os dados do teste. Por favor, tente novamente mais tarde.');
        setTestState('loading'); // Manter em loading para mostrar o erro
      }
    };

    fetchTestData();
  }, [id, router, session]);

  // Função para embaralhar array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Manipular seleção de opção
  const handleSelectOption = (optionId: string) => {
    if (testState !== 'in_progress') return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isMultipleChoice = currentQuestion.type === 'MULTIPLE_CHOICE';
    
    setAnswers(prev => {
      const questionId = currentQuestion.id;
      let newSelectedOptions: string[];
      
      if (isMultipleChoice) {
        // Para múltipla escolha, toggle a seleção
        newSelectedOptions = prev[questionId].includes(optionId)
          ? prev[questionId].filter(id => id !== optionId)
          : [...prev[questionId], optionId];
      } else {
        // Para escolha única, substitui a seleção
        newSelectedOptions = [optionId];
      }
      
      return { ...prev, [questionId]: newSelectedOptions };
    });
    
    // Atualizar índices de questões respondidas
    if (!answeredIndices.includes(currentQuestionIndex)) {
      setAnsweredIndices(prev => [...prev, currentQuestionIndex]);
    }
  };

  // Navegar entre questões
  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Navegar para a próxima questão
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navegar para a questão anterior
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Verificar se todas as questões foram respondidas
  const allQuestionsAnswered = () => {
    return answeredIndices.length === questions.length;
  };

  // Submeter o teste
  const submitTest = async () => {
    if (testState !== 'in_progress') return;
    
    setTestState('submitting');
    
    try {
      const response = await fetch(`/api/training/tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      
      if (!response.ok) throw new Error('Falha ao submeter o teste');
      
      const resultsData = await response.json();
      setResults(resultsData);
      setTestState('completed');
    } catch (error) {
      console.error('Erro ao submeter o teste:', error);
      alert('Ocorreu um erro ao submeter o teste. Por favor, tente novamente.');
      setTestState('in_progress');
    }
  };

  // Tentar o teste novamente
  const retryTest = async () => {
    if (!test || !test.maxAttempts || test.previousAttempts >= test.maxAttempts) {
      alert('Você atingiu o número máximo de tentativas para este teste.');
      return;
    }
    
    // Recarregar a página para iniciar um novo teste
    window.location.reload();
  };

  // Lidar com o tempo esgotado
  const handleTimeUp = () => {
    setTimeUp(true);
    // Submeter automaticamente o teste
    submitTest();
  };

  // Renderizar estado de carregamento
  if (testState === 'loading') {
    return (
      <StudentLayout>
        {error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-6">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size={12} />
          </div>
        )}
      </StudentLayout>
    );
  }

  // Renderizar quando não há teste
  if (!test || questions.length === 0) {
    return (
      <StudentLayout>
        <EmptyState 
          title="Teste não encontrado"
          description="O teste que você está procurando não existe ou você não tem acesso a ele."
          icon={<FiClock className="w-12 h-12 text-secondary-400" />}
        />
      </StudentLayout>
    );
  }

  // Renderizar resultados do teste
  if (testState === 'completed' && results) {
    return (
      <StudentLayout>
        <Head>
          <title>Resultados do Teste | AvaliaRH Treinamento</title>
        </Head>
        
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/treinamento" className="text-sm text-secondary-500 hover:text-secondary-700">
                  Início
                </Link>
              </li>
              {test.courseId && (
                <li>
                  <div className="flex items-center">
                    <FiChevronRight className="w-4 h-4 text-secondary-400" />
                    <Link 
                      href={`/treinamento/cursos/${test.courseId}`} 
                      className="ml-1 text-sm text-secondary-500 hover:text-secondary-700 md:ml-2"
                    >
                      {test.courseName}
                    </Link>
                  </div>
                </li>
              )}
              <li aria-current="page">
                <div className="flex items-center">
                  <FiChevronRight className="w-4 h-4 text-secondary-400" />
                  <span className="ml-1 text-sm font-medium text-secondary-700 md:ml-2">
                    Resultados do Teste
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">{test.title}</h1>
          <p className="text-secondary-600 mb-4">{test.description}</p>
        </div>
        
        <TestResults 
          score={results.score}
          totalQuestions={questions.length}
          correctAnswers={results.correctAnswers}
          passingScore={test.passingScore}
          courseId={test.courseId}
          courseName={test.courseName}
          testType={test.type}
          onRetry={test.maxAttempts && test.previousAttempts < test.maxAttempts ? retryTest : undefined}
        />
        
        {test.allowReview && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">Revisão de Questões</h2>
            
            {questions.map((question, index) => (
              <div key={question.id} className="mb-8 pb-8 border-b border-secondary-200 last:border-0">
                <TestQuestion 
                  question={question}
                  selectedOptions={answers[question.id] || []}
                  onSelectOption={() => {}} // Não permitir alterações
                  showFeedback={true}
                  correctOptions={results.correctOptionsByQuestion[question.id] || []}
                />
              </div>
            ))}
          </div>
        )}
      </StudentLayout>
    );
  }

  // Renderizar teste em andamento
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <StudentLayout>
      <Head>
        <title>{test.title} | AvaliaRH Treinamento</title>
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
            {test.courseId && (
              <li>
                <div className="flex items-center">
                  <FiChevronRight className="w-4 h-4 text-secondary-400" />
                  <Link 
                    href={`/treinamento/cursos/${test.courseId}`} 
                    className="ml-1 text-sm text-secondary-500 hover:text-secondary-700 md:ml-2"
                  >
                    {test.courseName}
                  </Link>
                </div>
              </li>
            )}
            <li aria-current="page">
              <div className="flex items-center">
                <FiChevronRight className="w-4 h-4 text-secondary-400" />
                <span className="ml-1 text-sm font-medium text-secondary-700 md:ml-2">
                  {test.title}
                </span>
              </div>
            </li>
          </ol>
        </nav>
      </div>
      
      {/* Cabeçalho do teste */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">{test.title}</h1>
            <p className="text-secondary-600">{test.description}</p>
          </div>
          
          {test.timeLimit && (
            <div className="mt-4 md:mt-0">
              <TestTimer 
                duration={test.timeLimit} 
                onTimeUp={handleTimeUp}
                isPaused={testState === 'submitting'}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Progresso do teste */}
      <TestProgress 
        currentQuestion={currentQuestionIndex}
        totalQuestions={questions.length}
        answeredQuestions={answeredIndices}
        onNavigate={navigateToQuestion}
      />
      
      {/* Questão atual */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4 flex justify-between items-center">
          <span className="text-sm font-medium text-secondary-500">
            Questão {currentQuestionIndex + 1} de {questions.length}
          </span>
        </div>
        
        <TestQuestion 
          question={currentQuestion}
          selectedOptions={answers[currentQuestion.id] || []}
          onSelectOption={handleSelectOption}
        />
      </div>
      
      {/* Navegação entre questões */}
      <div className="flex justify-between">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center
            ${currentQuestionIndex === 0 
              ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed' 
              : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
            }`}
        >
          <FiChevronLeft className="mr-2" />
          Anterior
        </button>
        
        {currentQuestionIndex < questions.length - 1 ? (
          <button
            onClick={goToNextQuestion}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors flex items-center"
          >
            Próxima
            <FiChevronRight className="ml-2" />
          </button>
        ) : (
          <button
            onClick={() => setConfirmSubmit(true)}
            disabled={testState === 'submitting'}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center
              ${testState === 'submitting'
                ? 'bg-secondary-400 text-white cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
          >
            {testState === 'submitting' ? (
              <>
                <LoadingSpinner size={4} color="white" className="mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <FiCheck className="mr-2" />
                Finalizar teste
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Modal de confirmação para enviar o teste */}
      {confirmSubmit && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-secondary-900 mb-4">Finalizar teste?</h3>
            
            {!allQuestionsAnswered() && (
              <div className="bg-yellow-50 p-4 rounded-md text-yellow-800 mb-4 flex items-start">
                <FiAlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>
                  Você ainda não respondeu todas as questões. 
                  Respondeu {answeredIndices.length} de {questions.length} questões.
                </p>
              </div>
            )}
            
            <p className="text-secondary-600 mb-6">
              Tem certeza que deseja finalizar o teste? Após enviar, você não poderá alterar suas respostas.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50"
              >
                Voltar ao teste
              </button>
              <button
                onClick={submitTest}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Finalizar teste
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de tempo esgotado */}
      {timeUp && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <FiClock className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-secondary-900 mb-4 text-center">Tempo esgotado!</h3>
            <p className="text-secondary-600 mb-6 text-center">
              O tempo para realização do teste acabou. Suas respostas foram enviadas automaticamente.
            </p>
            <div className="flex justify-center">
              <LoadingSpinner size={6} />
            </div>
          </div>
        </div>
      )}
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
