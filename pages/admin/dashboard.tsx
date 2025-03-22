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
import { StatsCard, ProcessCard, CourseCard, InsightCard } from '../../components/dashboard/cards'
import axios from 'axios'
import Link from 'next/link'

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
    averageScore?: number
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
        const candidatesResponse = await axios.get('/api/admin/candidates?activeOnly=true')
        setCandidates(candidatesResponse.data)
        
        // Carregar estatísticas
        const statisticsResponse = await axios.get('/api/admin/statistics')
        setStatistics(statisticsResponse.data)
        
        // Carregar processos seletivos ativos
        const processesResponse = await axios.get('/api/admin/processes/active')
        setProcesses(processesResponse.data)
        
        // Carregar cursos de treinamento
        try {
          const coursesResponse = await axios.get('/api/admin/training/courses')
          // A API agora retorna um objeto com courses e message
          setCourses(coursesResponse.data.courses || [])
        } catch (error) {
          console.error('Erro ao carregar cursos:', error)
          setCourses([])
        }
        
        // Gerar insights com base nos dados carregados
        generateInsights(statisticsResponse.data, candidatesResponse.data)
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
        setError('Não foi possível carregar os dados do dashboard. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status])
  
  // Gerar insights com base nos dados
  const generateInsights = (stats: Statistics, candidates: Candidate[]) => {
    const newInsights: Insight[] = []
    
    if (stats && stats.candidateStats) {
      // Insight sobre taxa de aprovação
      if (stats.candidateStats.approved > 0 && stats.candidateStats.total > 0) {
        const approvalRate = Math.round((stats.candidateStats.approved / stats.candidateStats.total) * 100)
        
        if (approvalRate > 70) {
          newInsights.push({
            id: '1',
            type: 'success',
            title: 'Alta taxa de aprovação',
            description: `A taxa de aprovação atual é de ${approvalRate}%, indicando um bom processo seletivo.`
          })
        } else if (approvalRate < 30) {
          newInsights.push({
            id: '2',
            type: 'warning',
            title: 'Baixa taxa de aprovação',
            description: `A taxa de aprovação atual é de apenas ${approvalRate}%. Considere revisar os critérios de seleção.`
          })
        }
      }
      
      // Insight sobre candidatos pendentes
      if (stats.candidateStats.pending > 5) {
        newInsights.push({
          id: '3',
          type: 'info',
          title: 'Candidatos pendentes',
          description: `Existem ${stats.candidateStats.pending} candidatos pendentes de avaliação.`
        })
      }
    }
    
    // Insight sobre candidatos recentes
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    const recentCandidates = candidates.filter(c => 
      new Date(c.createdAt) >= lastWeek
    ).length
    
    if (recentCandidates > 0) {
      newInsights.push({
        id: '4',
        type: 'info',
        title: 'Novos candidatos na última semana',
        description: `${recentCandidates} novo(s) candidato(s) se inscreveram na última semana.`
      })
    }
    
    // Insight de dica
    newInsights.push({
      id: '5',
      type: 'tip',
      title: 'Otimize seu processo seletivo',
      description: 'Considere adicionar testes específicos para cada posição para melhorar a qualidade dos candidatos aprovados.'
    })
    
    setInsights(newInsights)
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <StatsCard 
                key={i}
                title=""
                value={0}
                type="total"
                loading={true}
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {/* Estatísticas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard 
                title="Total de Candidatos"
                value={statistics?.candidateStats.total || 0}
                type="total"
              />
              <StatsCard 
                title="Aprovados"
                value={statistics?.candidateStats.approved || 0}
                type="approved"
              />
              <StatsCard 
                title="Reprovados"
                value={statistics?.candidateStats.rejected || 0}
                type="rejected"
              />
              <StatsCard 
                title="Pendentes"
                value={statistics?.candidateStats.pending || 0}
                type="pending"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Processos Seletivos Ativos */}
              <div className="col-span-1 lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4">Processos Seletivos Ativos</h2>
                {processes.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center">
                    <p className="text-gray-500">Nenhum processo seletivo ativo no momento.</p>
                    <Link 
                      href="/admin/processes/new" 
                      className="inline-block mt-3 text-sm text-sky-600 hover:text-sky-800 font-medium"
                    >
                      Criar novo processo seletivo
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {processes.slice(0, 4).map(process => (
                      <ProcessCard 
                        key={process.id}
                        id={process.id}
                        title={process.title}
                        position={process.position}
                        candidateCount={process.candidateCount}
                        startDate={process.startDate}
                        progress={process.progress}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Insights */}
              <div className="col-span-1">
                <h2 className="text-lg font-semibold mb-4">Insights</h2>
                <div className="space-y-3">
                  {insights.map(insight => (
                    <InsightCard 
                      key={insight.id}
                      type={insight.type}
                      title={insight.title}
                      description={insight.description}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Cursos de Treinamento */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">
                Cursos de Treinamento 
                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Em breve</span>
              </h2>
              <div className="bg-white rounded-lg shadow p-6 text-center opacity-70">
                <p className="text-gray-500">Funcionalidade de cursos de treinamento estará disponível em breve.</p>
                <button 
                  disabled
                  className="inline-block mt-3 text-sm bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed opacity-70"
                >
                  Criar novo curso
                </button>
              </div>
            </div>
            
            {/* Candidatos Recentes */}
            {candidates.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">Candidatos Recentes</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {candidates.slice(0, 5).map(candidate => (
                        <tr key={candidate.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{candidate.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {candidate.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {candidate.position || 'Não especificado'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}`}
                            >
                              {candidate.status === 'APPROVED' ? 'Aprovado' : 
                               candidate.status === 'REJECTED' ? 'Reprovado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(candidate.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {candidates.length > 5 && (
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                      <Link 
                        href="/admin/candidates" 
                        className="text-sm text-sky-600 hover:text-sky-800 font-medium"
                      >
                        Ver todos os candidatos
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default Dashboard
