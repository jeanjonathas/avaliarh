import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { FiSearch, FiFilter, FiBook, FiBarChart2, FiClock, FiAward } from 'react-icons/fi';

// Componentes
import StudentLayout from '../../components/training/StudentLayout';
import CourseCard from '../../components/training/CourseCard';
import ProgressStats from '../../components/training/ProgressStats';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

// Tipos
interface Course {
  id: string;
  name: string;
  description: string;
  sectorName: string;
  moduleCount: number;
  lessonCount: number;
  progress: number;
  completed: boolean;
  imageUrl?: string;
}

interface ProgressStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  averageScore: number;
  totalLessonsCompleted: number;
  totalTimeSpent: number; // em minutos
}

export default function TrainingPortal() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'in-progress', 'not-started'
  const [filterSector, setFilterSector] = useState('all');
  const [sectors, setSectors] = useState<{id: string, name: string}[]>([]);

  // Buscar cursos e estatísticas
  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.push('/');
          return;
        }

        // Registrar acesso
        await fetch('/api/training/access-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: new Date().toISOString() })
        });

        // Buscar cursos disponíveis
        const coursesResponse = await fetch('/api/training/courses');
        if (!coursesResponse.ok) throw new Error('Falha ao carregar cursos');
        const coursesData = await coursesResponse.json();
        
        // Buscar estatísticas de progresso
        const statsResponse = await fetch('/api/training/progress/stats');
        if (!statsResponse.ok) throw new Error('Falha ao carregar estatísticas');
        const statsData = await statsResponse.json();
        
        // Extrair setores únicos dos cursos
        const uniqueSectors = [...new Set(coursesData.map(course => course.sectorName))];
        setSectors(uniqueSectors.map(name => ({ id: name, name })));
        
        setCourses(coursesData);
        setFilteredCourses(coursesData);
        setProgressStats(statsData);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Não foi possível carregar os cursos. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Filtrar cursos quando os filtros mudarem
  useEffect(() => {
    let filtered = [...courses];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(course => {
        if (filterStatus === 'completed') return course.completed;
        if (filterStatus === 'in-progress') return course.progress > 0 && !course.completed;
        if (filterStatus === 'not-started') return course.progress === 0;
        return true;
      });
    }
    
    // Filtrar por setor
    if (filterSector !== 'all') {
      filtered = filtered.filter(course => course.sectorName === filterSector);
    }
    
    setFilteredCourses(filtered);
  }, [searchTerm, filterStatus, filterSector, courses]);

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

  return (
    <StudentLayout>
      <Head>
        <title>Portal de Treinamento | AvaliaRH</title>
      </Head>

      {/* Cabeçalho e estatísticas */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900 mb-2">Meus Treinamentos</h1>
        <p className="text-secondary-600 mb-6">
          Bem-vindo ao seu portal de treinamento. Aqui você pode acessar todos os seus cursos e acompanhar seu progresso.
        </p>
        
        {progressStats && (
          <ProgressStats 
            totalCourses={progressStats.totalCourses}
            completedCourses={progressStats.completedCourses}
            inProgressCourses={progressStats.inProgressCourses}
            averageScore={progressStats.averageScore}
            totalLessonsCompleted={progressStats.totalLessonsCompleted}
            totalTimeSpent={progressStats.totalTimeSpent}
          />
        )}
      </div>

      {/* Filtros e busca */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-secondary-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cursos..."
              className="pl-10 pr-4 py-2 w-full border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="text-secondary-400" />
              </div>
              <select
                className="pl-10 pr-4 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="not-started">Não iniciados</option>
                <option value="in-progress">Em andamento</option>
                <option value="completed">Concluídos</option>
              </select>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiBook className="text-secondary-400" />
              </div>
              <select
                className="pl-10 pr-4 py-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
              >
                <option value="all">Todos os setores</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.name}>{sector.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de cursos */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <CourseCard 
              key={course.id}
              id={course.id}
              title={course.name}
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
        <EmptyState 
          title="Nenhum curso encontrado"
          description="Não encontramos nenhum curso com os filtros selecionados. Tente ajustar seus filtros ou entre em contato com o administrador."
          icon={<FiBook className="w-12 h-12 text-secondary-400" />}
        />
      )}
    </StudentLayout>
  );
}

// Garantir que o usuário esteja autenticado
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
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
