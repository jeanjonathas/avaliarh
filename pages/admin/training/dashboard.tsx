import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AdminLayout from '../../../components/admin/AdminLayout'
import { 
  TrainingStats, 
  RecentCourses, 
  TopStudents, 
  RecentActivities, 
  CompletionRateChart, 
  QuickActions, 
  DateRangeFilter 
} from '../../../components/admin/training/dashboard'

// Interfaces para os dados
interface Course {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  createdAt: string;
  completionRate: number;
}

interface Student {
  id: string;
  userId: string;
  name: string;
  avgProgress: number;
  enrolledCourses: number;
}

interface Activity {
  id: string;
  type: 'enrollment' | 'completion' | 'test_submission' | 'certificate';
  userName: string;
  courseName: string;
  timestamp: string;
  details?: string;
}

interface CompletionData {
  courseId: string;
  courseName: string;
  completionRate: number;
}

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  completionRate: number;
  averageTimeSpent: number;
}

const TrainingDashboard: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Estados para armazenar os dados
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    completionRate: 0,
    averageTimeSpent: 0
  })
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [completionData, setCompletionData] = useState<CompletionData[]>([])
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  // Função para buscar os dados do dashboard
  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      // Buscar estatísticas gerais
      const statsResponse = await axios.get('/api/admin/training/statistics', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      })
      
      if (statsResponse.data) {
        // Processar estatísticas gerais
        const { courses, enrollmentStats, accessStats, studentProgress } = statsResponse.data
        
        // Calcular estatísticas
        const totalStudents = studentProgress?.length || 0
        const totalCourses = courses?.length || 0
        
        // Calcular taxa média de conclusão
        let totalCompletionRate = 0
        let courseCount = 0
        
        enrollmentStats?.forEach((stat: any) => {
          if (stat.avg_progress) {
            totalCompletionRate += Number(stat.avg_progress)
            courseCount++
          }
        })
        
        const avgCompletionRate = courseCount > 0 
          ? Math.round(totalCompletionRate / courseCount) 
          : 0
        
        // Calcular tempo médio gasto
        let totalTimeSpent = 0
        
        accessStats?.forEach((stat: any) => {
          if (stat.total_time_spent) {
            totalTimeSpent += Number(stat.total_time_spent)
          }
        })
        
        // Converter minutos para horas
        const avgTimeSpent = totalStudents > 0 
          ? Math.round((totalTimeSpent / 60) / totalStudents * 10) / 10
          : 0
        
        setStats({
          totalStudents,
          totalCourses,
          completionRate: avgCompletionRate,
          averageTimeSpent: avgTimeSpent
        })
        
        // Processar dados de cursos
        const processedCourses = courses?.map((course: any) => {
          const enrollmentStat = enrollmentStats?.find((stat: any) => stat.courseId === course.id)
          
          return {
            id: course.id,
            name: course.name,
            description: course.description,
            studentCount: enrollmentStat?.count || 0,
            createdAt: course.created_at || new Date().toISOString(),
            completionRate: enrollmentStat?.avg_progress 
              ? Math.round(Number(enrollmentStat.avg_progress)) 
              : 0
          }
        }) || []
        
        setCourses(processedCourses)
        
        // Processar dados de conclusão para o gráfico
        const chartData = processedCourses
          .filter((course: Course) => course.completionRate > 0)
          .map((course: Course) => ({
            courseId: course.id,
            courseName: course.name,
            completionRate: course.completionRate
          }))
        
        setCompletionData(chartData)
        
        // Processar dados de alunos
        const processedStudents = studentProgress?.map((student: any) => ({
          id: student.id,
          userId: student.userId,
          name: student.name,
          avgProgress: student.avg_progress ? Math.round(Number(student.avg_progress)) : 0,
          enrolledCourses: student.enrolled_courses || 0
        })) || []
        
        setStudents(processedStudents)
        
        // Simular atividades recentes (em um ambiente real, isso viria da API)
        // Isso seria substituído por dados reais da API
        const mockActivities = [
          {
            id: '1',
            type: 'enrollment' as const,
            userName: 'João Silva',
            courseName: 'Introdução ao RH',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutos atrás
            details: 'Matrícula realizada com sucesso'
          },
          {
            id: '2',
            type: 'completion' as const,
            userName: 'Maria Souza',
            courseName: 'Gestão de Pessoas',
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 horas atrás
            details: 'Nota final: 95/100'
          },
          {
            id: '3',
            type: 'test_submission' as const,
            userName: 'Carlos Oliveira',
            courseName: 'Recrutamento e Seleção',
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 horas atrás
            details: 'Resultado: 85% de acertos'
          },
          {
            id: '4',
            type: 'certificate' as const,
            userName: 'Ana Pereira',
            courseName: 'Legislação Trabalhista',
            timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 horas atrás
          },
          {
            id: '5',
            type: 'enrollment' as const,
            userName: 'Pedro Santos',
            courseName: 'Cultura Organizacional',
            timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 horas atrás
          }
        ]
        
        setActivities(mockActivities)
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])
  
  // Funções para os botões de ação rápida
  const handleCreateCourse = () => {
    router.push('/admin/training/courses/new')
  }
  
  const handleEnrollStudents = () => {
    router.push('/admin/training/student-management')
  }
  
  const handleGenerateReport = () => {
    // Implementar geração de relatório
    alert('Funcionalidade de geração de relatório em desenvolvimento')
  }
  
  // Função para atualizar o filtro de data
  const handleDateFilterChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate })
  }
  
  // Efeito para verificar autenticação
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  // Efeito para buscar dados quando o componente montar ou o filtro de data mudar
  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, fetchDashboardData])
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
  }
  
  return (
    <AdminLayout activeSection={'treinamento'}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 mb-4 md:mb-0">
            Dashboard de Treinamento
          </h1>
          
          <div className="flex space-x-2">
            <button
              onClick={() => fetchDashboardData()}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors text-sm font-medium flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
            
            <button
              onClick={() => router.push('/admin/training')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Gerenciar Treinamentos
            </button>
          </div>
        </div>
        
        {/* Filtro de período */}
        <DateRangeFilter 
          startDate={dateRange.startDate} 
          endDate={dateRange.endDate} 
          onFilterChange={handleDateFilterChange} 
        />
        
        {/* Estatísticas gerais */}
        <TrainingStats stats={stats} loading={loading} />
        
        {/* Ações rápidas e gráfico de conclusão */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <QuickActions 
              onCreateCourse={handleCreateCourse}
              onEnrollStudents={handleEnrollStudents}
              onGenerateReport={handleGenerateReport}
            />
          </div>
          
          <div className="lg:col-span-2">
            <CompletionRateChart completionData={completionData} loading={loading} />
          </div>
        </div>
        
        {/* Cursos recentes e alunos com melhor desempenho */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RecentCourses courses={courses} loading={loading} />
          <TopStudents students={students} loading={loading} />
        </div>
        
        {/* Atividades recentes */}
        <RecentActivities activities={activities} loading={loading} />
      </div>
    </AdminLayout>
  )
}

export default TrainingDashboard
