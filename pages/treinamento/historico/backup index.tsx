import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiClock, 
  FiBook, 
  FiAward, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight,
  FiCalendar,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import Timeline from '../../../components/training/Timeline';

// Tipos
interface HistoryItem {
  id: string;
  type: 'access' | 'lesson' | 'test';
  description: string;
  date: string;
  courseId?: string;
  courseName?: string;
  lessonId?: string;
  lessonName?: string;
  moduleId?: string;
  moduleName?: string;
  timeSpent?: number;
  score?: number;
  passed?: boolean;
  icon: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface HistoryProps {
  initialData: HistoryItem[];
  initialPagination: PaginationInfo;
}

export default function History({ initialData, initialPagination }: HistoryProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(initialData);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'access' | 'lessons' | 'tests'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');

  // Buscar histórico
  const fetchHistory = async (type: 'all' | 'access' | 'lessons' | 'tests' = 'all', pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/training/history?type=${type}&page=${pageNum}&limit=10`);
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/treinamento/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error('Falha ao carregar histórico');
      }
      
      const data = await response.json();
      setHistoryItems(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      setError('Não foi possível carregar o histórico. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar histórico quando o filtro ou página mudar
  useEffect(() => {
    fetchHistory(filter, page);
  }, [filter, page]);

  // Formatar duração em horas, minutos e segundos
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes} min`;
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizar ícone com base no tipo
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'FiClock':
        return <FiClock className="text-primary-500" size={20} />;
      case 'FiBook':
        return <FiBook className="text-blue-500" size={20} />;
      case 'FiAward':
        return <FiAward className="text-yellow-500" size={20} />;
      default:
        return <FiClock className="text-primary-500" size={20} />;
    }
  };

  // Renderizar item de histórico (para visualização em lista)
  const renderHistoryItem = (item: HistoryItem) => {
    return (
      <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 mb-3 border-l-4 border-primary-500">
        <div className="flex items-start">
          <div className="bg-secondary-100 p-2 rounded-full mr-4">
            {renderIcon(item.icon)}
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
              <h3 className="text-secondary-900 font-medium">{item.description}</h3>
              <span className="text-secondary-500 text-sm flex items-center mt-1 sm:mt-0">
                <FiCalendar className="mr-1" size={14} />
                {formatDate(item.date)}
              </span>
            </div>
            
            <div className="text-sm text-secondary-600">
              {item.courseName && (
                <Link href={`/treinamento/cursos/${item.courseId}`} className="text-primary-600 hover:underline">
                  {item.courseName}
                </Link>
              )}
              
              {item.moduleName && (
                <span> &gt; {item.moduleName}</span>
              )}
              
              {item.lessonName && (
                <span> &gt; {item.lessonName}</span>
              )}
            </div>
            
            <div className="flex flex-wrap mt-2 text-sm">
              {item.timeSpent !== undefined && (
                <span className="mr-4 flex items-center text-secondary-600">
                  <FiClock className="mr-1" size={14} />
                  {formatDuration(item.timeSpent)}
                </span>
              )}
              
              {item.score !== undefined && (
                <span className="mr-4 flex items-center text-blue-600">
                  <FiAward className="mr-1" size={14} />
                  Nota: {item.score}%
                </span>
              )}
              
              {item.passed !== undefined && (
                <span className={`flex items-center ${item.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {item.passed ? (
                    <>
                      <FiCheckCircle className="mr-1" size={14} />
                      Aprovado
                    </>
                  ) : (
                    <>
                      <FiXCircle className="mr-1" size={14} />
                      Reprovado
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <Head>
        <title>Histórico de Atividades | Portal de Treinamento</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 mb-4 md:mb-0">Histórico de Atividades</h1>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2">
              <FiFilter className="text-secondary-500" />
              <span className="text-secondary-600 mr-2">Filtrar por:</span>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setFilter('all'); setPage(1); }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'all' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  Todos
                </button>
                
                <button
                  onClick={() => { setFilter('access'); setPage(1); }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'access' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  Acessos
                </button>
                
                <button
                  onClick={() => { setFilter('lessons'); setPage(1); }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'lessons' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  Aulas
                </button>
                
                <button
                  onClick={() => { setFilter('tests'); setPage(1); }}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === 'tests' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  Testes
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-0 sm:ml-4 mt-3 sm:mt-0">
              <div className="flex border border-secondary-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm ${
                    viewMode === 'list' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white text-secondary-700 hover:bg-secondary-50'
                  }`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1 text-sm ${
                    viewMode === 'timeline' 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-white text-secondary-700 hover:bg-secondary-50'
                  }`}
                >
                  Timeline
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size={40} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        ) : historyItems.length === 0 ? (
          <EmptyState
            icon={<FiClock size={48} />}
            title="Nenhum registro encontrado"
            description={
              filter !== 'all'
                ? `Você ainda não possui registros de ${
                    filter === 'access' ? 'acesso' : filter === 'lessons' ? 'aulas concluídas' : 'testes realizados'
                  }.`
                : "Você ainda não possui registros de atividade."
            }
          />
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="space-y-3">
                {historyItems.map(renderHistoryItem)}
              </div>
            ) : (
              <Timeline items={historyItems} />
            )}
            
            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-md ${
                      page === 1 
                        ? 'text-secondary-400 cursor-not-allowed' 
                        : 'text-secondary-700 hover:bg-secondary-100'
                    }`}
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  
                  <div className="text-secondary-700">
                    Página {page} de {pagination.pages}
                  </div>
                  
                  <button
                    onClick={() => setPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={page === pagination.pages}
                    className={`p-2 rounded-md ${
                      page === pagination.pages 
                        ? 'text-secondary-400 cursor-not-allowed' 
                        : 'text-secondary-700 hover:bg-secondary-100'
                    }`}
                  >
                    <FiChevronRight size={20} />
                  </button>
                </nav>
              </div>
            )}
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
        destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/historico'),
        permanent: false,
      },
    };
  }
  
  try {
    // Buscar histórico diretamente no servidor
    const baseUrl = process.env.NEXTAUTH_URL || `https://${context.req.headers.host}`;
    const response = await fetch(`${baseUrl}/api/training/history?type=all&page=1&limit=10`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          redirect: {
            destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/historico'),
            permanent: false,
          },
        };
      }
      throw new Error('Falha ao carregar dados do histórico');
    }
    
    const data = await response.json();
    
    return {
      props: {
        initialData: data.data,
        initialPagination: data.pagination,
      },
    };
  } catch (error) {
    console.error('Erro ao carregar dados do histórico:', error);
    
    // Retornar array vazio em caso de erro para evitar falha na renderização
    return {
      props: {
        initialData: [],
        initialPagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 1
        },
      },
    };
  }
};
