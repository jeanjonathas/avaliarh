import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiBook, FiClock, FiBarChart2, FiCheckCircle, FiSearch, FiFilter } from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';

// Tipos
interface Course {
  id: string;
  title: string;
  description: string;
  sectorName: string;
  moduleCount: number;
  lessonCount: number;
  progress: number;
  completed: boolean;
  imageUrl: string;
}

interface CourseListProps {
  initialCourses: Course[];
}

export default function CourseList({ initialCourses }: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  // Buscar cursos atualizados
  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/training/courses');
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/treinamento/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          return;
        }
        throw new Error('Falha ao carregar cursos');
      }
      
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
      setError('Não foi possível carregar os cursos. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cursos com base na busca e filtro
  const filteredCourses = courses.filter(course => {
    // Filtrar por termo de busca
    const matchesSearch = 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.sectorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar por status
    let matchesFilter = true;
    if (filter === 'completed') {
      matchesFilter = course.completed;
    } else if (filter === 'in-progress') {
      matchesFilter = !course.completed && course.progress > 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Renderizar card de curso
  const renderCourseCard = (course: Course) => {
    return (
      <div 
        key={course.id} 
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      >
        <div className="relative h-40 w-full">
          <Image 
            src={course.imageUrl} 
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {course.completed && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
              <FiCheckCircle size={20} />
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold text-secondary-900 mb-2 line-clamp-2">{course.title}</h3>
          
          <p className="text-secondary-700 text-sm mb-4 line-clamp-2">
            {course.description || 'Sem descrição disponível'}
          </p>
          
          <div className="text-xs text-secondary-500 mb-3">
            <span className="inline-flex items-center mr-3">
              <FiBook className="mr-1" /> {course.moduleCount} módulos
            </span>
            <span className="inline-flex items-center">
              <FiClock className="mr-1" /> {course.lessonCount} aulas
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="h-2 w-full bg-secondary-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${course.completed ? 'bg-green-500' : 'bg-primary-500'}`}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-secondary-500">{course.progress}% concluído</span>
                {course.progress > 0 && !course.completed && (
                  <span className="text-primary-500">Em andamento</span>
                )}
              </div>
            </div>
            
            <Link 
              href={`/treinamento/cursos/${course.id}`}
              className="px-3 py-1 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors"
            >
              {course.progress === 0 ? 'Iniciar' : 'Continuar'}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <Head>
        <title>Meus Cursos | Portal de Treinamento</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 mb-4 md:mb-0">Meus Cursos</h1>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-secondary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500" />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-secondary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos os cursos</option>
              <option value="in-progress">Em andamento</option>
              <option value="completed">Concluídos</option>
            </select>
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
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            icon={<FiBook size={48} />}
            title="Nenhum curso encontrado"
            description={
              searchTerm || filter !== 'all'
                ? "Tente ajustar seus filtros ou termos de busca."
                : "Você ainda não está matriculado em nenhum curso."
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(renderCourseCard)}
          </div>
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
        destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/cursos'),
        permanent: false,
      },
    };
  }
  
  try {
    // Buscar cursos diretamente no servidor
    const baseUrl = process.env.NEXTAUTH_URL || `https://${context.req.headers.host}`;
    const response = await fetch(`${baseUrl}/api/training/courses`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          redirect: {
            destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/cursos'),
            permanent: false,
          },
        };
      }
      throw new Error('Falha ao carregar dados dos cursos');
    }
    
    const courses = await response.json();
    
    return {
      props: {
        initialCourses: courses,
      },
    };
  } catch (error) {
    console.error('Erro ao carregar dados dos cursos:', error);
    
    // Retornar array vazio em caso de erro para evitar falha na renderização
    return {
      props: {
        initialCourses: [],
      },
    };
  }
};
