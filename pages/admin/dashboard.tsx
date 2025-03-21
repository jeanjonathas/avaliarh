import type { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  SystemStats,
  PerformanceCharts,
  CandidatesList,
  ActiveProcesses,
  TrainingCourses,
  InsightsPanel,
  QuickActions,
  LoadingState,
  ErrorState
} from '../../components/dashboard'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
)

interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  testDate: string
  interviewDate?: string
  completed: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rating?: number
  observations?: string
  infoJobsLink?: string
  socialMediaUrl?: string
  resumeFile?: string
  score?: number
  createdAt: string
  updatedAt: string
  responses?: any[]
  stageScores?: {
    id: string
    name: string
    correct: number
    total: number
    percentage: number
  }[]
}

interface Statistics {
  stageStats: {
    id: string
    name: string
    order: number
    correctResponses: number
    totalResponses: number
    successRate: number
  }[]
  expectedSuccessRate: number
  averageSuccessRate: number
  candidateStats: {
    total: number
    completed: number
    approved: number
    rejected: number
    pending: number
  }
  averageStageScores: number[]
}

interface Process {
  id: string
  title: string
  position: string
  status: 'ACTIVE' | 'COMPLETED' | 'DRAFT'
  candidateCount: number
  startDate: string
  endDate?: string
  progress: number
}

interface Course {
  id: string
  title: string
  category: string
  studentCount: number
  completionRate: number
  instructor: string
  duration: string
}

interface Insight {
  id: string
  type: 'info' | 'warning' | 'success' | 'tip'
  title: string
  description: string
}

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Estados para dados
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  
  // Estados para gerenciamento de UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  
  // Estados para gráficos
  const [categorySuccessData, setCategorySuccessData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Taxa de Sucesso (%)',
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  })
  
  const [realVsExpectedData, setRealVsExpectedData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Taxa Real',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Taxa Esperada',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      }
    ]
  })
  
  const [overallPerformanceData, setOverallPerformanceData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1,
      }
    ]
  })
  
  const [trendData, setTrendData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Aprovados',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Reprovados',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      }
    ]
  })

  // Opções para os gráficos
  const categorySuccessOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Taxa de Sucesso por Categoria',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Porcentagem (%)'
        }
      }
    }
  }

  const realVsExpectedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Taxa Real vs Esperada',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Porcentagem (%)'
        }
      }
    }
  }

  const overallPerformanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Desempenho Geral',
        font: {
          size: 16
        }
      },
    }
  }

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Tendências de Aprovação',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Número de Candidatos'
        }
      }
    }
  }

  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  // Carregar dados para o dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Carregar candidatos
        const candidatesResponse = await fetch('/api/admin/candidates?activeOnly=true')
        if (!candidatesResponse.ok) {
          throw new Error(`Erro ao carregar os candidatos: ${candidatesResponse.status}`)
        }
        const candidatesData = await candidatesResponse.json()
        setCandidates(Array.isArray(candidatesData) ? candidatesData : [])
        
        // Carregar estatísticas
        const statisticsResponse = await fetch('/api/admin/statistics')
        if (!statisticsResponse.ok) {
          throw new Error('Erro ao carregar estatísticas')
        }
        const statisticsData = await statisticsResponse.json()
        setStatistics(statisticsData)
        
        // Carregar processos seletivos (mock para demonstração)
        // Em produção, substituir por chamada à API real
        setProcesses([
          {
            id: '1',
            title: 'Processo Seletivo - Desenvolvedor Frontend',
            position: 'Desenvolvedor Frontend',
            status: 'ACTIVE',
            candidateCount: 12,
            startDate: '2023-06-01',
            progress: 75
          },
          {
            id: '2',
            title: 'Processo Seletivo - Analista de Dados',
            position: 'Analista de Dados',
            status: 'ACTIVE',
            candidateCount: 8,
            startDate: '2023-06-15',
            progress: 50
          },
          {
            id: '3',
            title: 'Processo Seletivo - UX/UI Designer',
            position: 'Designer UX/UI',
            status: 'ACTIVE',
            candidateCount: 6,
            startDate: '2023-07-01',
            progress: 25
          }
        ])
        
        // Carregar cursos de treinamento (mock para demonstração)
        // Em produção, substituir por chamada à API real
        setCourses([
          {
            id: '1',
            title: 'Introdução ao React',
            category: 'Desenvolvimento Web',
            studentCount: 24,
            completionRate: 68,
            instructor: 'João Silva',
            duration: '20h'
          },
          {
            id: '2',
            title: 'Análise de Dados com Python',
            category: 'Ciência de Dados',
            studentCount: 18,
            completionRate: 75,
            instructor: 'Maria Oliveira',
            duration: '15h'
          },
          {
            id: '3',
            title: 'Princípios de UX/UI',
            category: 'Design',
            studentCount: 15,
            completionRate: 80,
            instructor: 'Carlos Mendes',
            duration: '12h'
          }
        ])
        
        // Carregar insights (mock para demonstração)
        // Em produção, substituir por chamada à API real ou algoritmo de análise
        setInsights([
          {
            id: '1',
            type: 'info',
            title: 'Aumento na taxa de aprovação',
            description: 'A taxa de aprovação aumentou 12% no último mês, indicando uma melhoria na qualidade dos candidatos.'
          },
          {
            id: '2',
            type: 'warning',
            title: 'Baixa conclusão em testes lógicos',
            description: 'Apenas 65% dos candidatos estão concluindo os testes de raciocínio lógico. Considere revisar a dificuldade.'
          },
          {
            id: '3',
            type: 'success',
            title: 'Novo recorde de candidatos',
            description: 'Este mês registrou o maior número de candidatos inscritos desde o início da plataforma.'
          },
          {
            id: '4',
            type: 'tip',
            title: 'Otimize o processo de seleção',
            description: 'Adicionar uma etapa de entrevista técnica pode melhorar a qualidade final dos candidatos aprovados.'
          }
        ])
        
        // Atualizar dados dos gráficos com base nas estatísticas
        if (statisticsData && statisticsData.stageStats) {
          updateChartData(statisticsData)
        }
        
        // Atualizar dados de tendências com base nos candidatos
        if (candidatesData && Array.isArray(candidatesData) && candidatesData.length > 0) {
          updateTrendData(candidatesData)
        }
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
        setError('Não foi possível carregar os dados do dashboard. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])
  
  // Função para atualizar dados dos gráficos
  const updateChartData = (stats: Statistics) => {
    if (!stats || !stats.stageStats || !Array.isArray(stats.stageStats)) {
      console.error('Dados de estatísticas inválidos:', stats)
      return
    }
    
    // Ordenar etapas por ordem
    const sortedStages = [...stats.stageStats].sort((a, b) => a.order - b.order)
    
    // Atualizar dados de sucesso por categoria
    setCategorySuccessData({
      labels: sortedStages.map(stage => stage.name),
      datasets: [
        {
          label: 'Taxa de Sucesso (%)',
          data: sortedStages.map(stage => Math.round(stage.successRate * 100)),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    })
    
    // Atualizar dados de taxa real vs esperada
    setRealVsExpectedData({
      labels: sortedStages.map(stage => stage.name),
      datasets: [
        {
          label: 'Taxa Real',
          data: sortedStages.map(stage => Math.round(stage.successRate * 100)),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderWidth: 0,
          borderRadius: 4,
        },
        {
          label: 'Taxa Esperada',
          data: sortedStages.map(() => Math.round(stats.expectedSuccessRate * 100)),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderWidth: 0,
          borderRadius: 4,
        }
      ]
    })
    
    // Atualizar dados de desempenho geral
    setOverallPerformanceData({
      labels: ['Aprovados', 'Reprovados', 'Pendentes'],
      datasets: [
        {
          data: [
            stats.candidateStats.approved,
            stats.candidateStats.rejected,
            stats.candidateStats.pending
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1,
        }
      ]
    })
  }
  
  // Função para atualizar dados de tendências
  const updateTrendData = (candidatesData: Candidate[]) => {
    // Obter os últimos 6 meses
    const today = new Date()
    const months = []
    const approvedCounts = []
    const rejectedCounts = []
    
    // Gerar os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthName = month.toLocaleString('pt-BR', { month: 'short' }).charAt(0).toUpperCase() + 
                       month.toLocaleString('pt-BR', { month: 'short' }).slice(1, 3)
      months.push(monthName)
      
      // Filtrar candidatos para este mês
      const monthCandidates = candidatesData.filter(candidate => {
        const candidateDate = new Date(candidate.createdAt)
        return candidateDate.getMonth() === month.getMonth() && 
               candidateDate.getFullYear() === month.getFullYear()
      })
      
      // Contar aprovados e rejeitados
      const approved = monthCandidates.filter(c => c.status === 'APPROVED').length
      const rejected = monthCandidates.filter(c => c.status === 'REJECTED').length
      
      approvedCounts.push(approved)
      rejectedCounts.push(rejected)
    }
    
    // Atualizar dados de tendências
    setTrendData({
      labels: months,
      datasets: [
        {
          label: 'Aprovados',
          data: approvedCounts,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Reprovados',
          data: rejectedCounts,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        }
      ]
    })
  }
  
  // Função para calcular compatibilidade do candidato
  const calculateCompatibility = (candidate: Candidate) => {
    if (!candidate.stageScores || candidate.stageScores.length === 0) {
      return 0
    }
    
    // Cálculo simples de compatibilidade baseado na pontuação média
    const totalCorrect = candidate.stageScores.reduce((acc, stage) => acc + stage.correct, 0)
    const totalQuestions = candidate.stageScores.reduce((acc, stage) => acc + stage.total, 0)
    
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  }
  
  // Função para lidar com a visualização de detalhes do candidato
  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    // Implementar lógica para mostrar detalhes do candidato
    // Por exemplo, abrir um modal ou navegar para a página de detalhes
    router.push(`/admin/candidates/${candidate.id}`)
  }
  
  // Funções para ações rápidas
  const handleAddCandidate = () => {
    router.push('/admin/candidates/new')
  }
  
  const handleCreateProcess = () => {
    router.push('/admin/processes/new')
  }
  
  const handleCreateCourse = () => {
    router.push('/admin/training/courses/new')
  }
  
  const handleExportData = () => {
    // Implementar lógica para exportar dados
    alert('Funcionalidade de exportação de dados será implementada em breve.')
  }
  
  // Função para tentar novamente em caso de erro
  const handleRetry = () => {
    setError(null)
    setLoading(true)
    // Recarregar a página para tentar novamente
    window.location.reload()
  }

  // Renderizar estado de carregamento
  if (loading) {
    return (
      <AdminLayout>
        <LoadingState message="Carregando dados do dashboard..." />
      </AdminLayout>
    )
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <AdminLayout>
        <ErrorState message={error} onRetry={handleRetry} />
      </AdminLayout>
    )
  }

  // Renderizar dashboard
  return (
    <AdminLayout>
      <div className="p-6 bg-secondary-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard Admitto</h1>
          <p className="text-secondary-600">Visão geral do sistema e métricas de desempenho</p>
        </div>
        
        {/* Estatísticas do Sistema */}
        <SystemStats statistics={statistics} />
        
        {/* Ações Rápidas e Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <QuickActions 
              onAddCandidate={handleAddCandidate}
              onCreateProcess={handleCreateProcess}
              onCreateCourse={handleCreateCourse}
              onExportData={handleExportData}
            />
          </div>
          <div className="lg:col-span-2">
            <InsightsPanel insights={insights} />
          </div>
        </div>
        
        {/* Gráficos de Desempenho */}
        <div className="mb-6">
          <PerformanceCharts 
            categorySuccessData={categorySuccessData}
            categorySuccessOptions={categorySuccessOptions}
            realVsExpectedData={realVsExpectedData}
            realVsExpectedOptions={realVsExpectedOptions}
            overallPerformanceData={overallPerformanceData}
            overallPerformanceOptions={overallPerformanceOptions}
            trendData={trendData}
            trendOptions={trendOptions}
          />
        </div>
        
        {/* Lista de Candidatos */}
        <div className="mb-6">
          <CandidatesList 
            candidates={candidates}
            onViewCandidate={handleViewCandidate}
            calculateCompatibility={calculateCompatibility}
          />
        </div>
        
        {/* Processos Seletivos e Cursos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActiveProcesses processes={processes} />
          <TrainingCourses courses={courses} />
        </div>
      </div>
    </AdminLayout>
  )
}

export default Dashboard
