import { Candidate } from '../types'
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
import { Bar, Radar } from 'react-chartjs-2'
import { useEffect, useState } from 'react'
import { toast, Toaster } from 'react-hot-toast'

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

interface CandidateResultsTabProps {
  candidate: Candidate
}

interface CandidateResults {
  score: {
    total: number
    correct: number
    percentage: number
  }
  stageScores: Array<{
    id: string
    name: string
    total: number
    correct: number
    percentage: number
  }>
  skillScores: Array<{
    skill: string
    total: number
    correct: number
    percentage: number
  }>
  completed: boolean
  timeSpent: number
}

export const CandidateResultsTab = ({ candidate }: CandidateResultsTabProps) => {
  const [results, setResults] = useState<CandidateResults | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/admin/candidates/${candidate.id}/results`, {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Erro ao buscar resultados')
        }

        const data = await response.json()
        setResults(data)
      } catch (error) {
        console.error('Erro ao buscar resultados:', error)
        toast.error('Não foi possível carregar os resultados do candidato')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [candidate.id])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <Toaster position="top-right" />
      </div>
    )
  }

  if (!results?.completed) {
    return (
      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
        <p className="mt-2 text-blue-700">
          Este candidato ainda não realizou o teste. Os resultados serão exibidos após a conclusão da avaliação.
        </p>
        <Toaster position="top-right" />
      </div>
    )
  }

  // Preparar dados para o gráfico de barras de desempenho por etapa
  const stageData = {
    labels: results.stageScores.map(stage => stage.name),
    datasets: [
      {
        label: 'Porcentagem de Acertos',
        data: results.stageScores.map(stage => stage.percentage),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }
    ]
  }

  // Opções para o gráfico de barras
  const stageOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Desempenho por Etapa'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: number) => `${value}%`
        }
      }
    }
  }

  // Dados para o gráfico de radar
  const radarData = {
    labels: results.skillScores.map(score => score.skill),
    datasets: [
      {
        label: 'Desempenho do Candidato',
        data: results.skillScores.map(score => score.percentage),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)'
      }
    ]
  }

  // Opções para o gráfico de radar
  const radarOptions = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Desempenho por Habilidade'
      }
    }
  }

  // Função para formatar o tempo gasto
  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min`
  }

  // Função para determinar o status baseado na porcentagem
  const getStatusInfo = (percentage: number) => {
    if (percentage >= 80) {
      return {
        text: 'Excelente',
        color: 'bg-green-100 text-green-800',
        progressColor: 'bg-green-500'
      }
    } else if (percentage >= 60) {
      return {
        text: 'Satisfatório',
        color: 'bg-yellow-100 text-yellow-800',
        progressColor: 'bg-yellow-500'
      }
    } else {
      return {
        text: 'Precisa Melhorar',
        color: 'bg-red-100 text-red-800',
        progressColor: 'bg-red-500'
      }
    }
  }

  const statusInfo = getStatusInfo(results.score.percentage)

  return (
    <div className="space-y-8">
      <Toaster position="top-right" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card de Pontuação Geral */}
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 text-primary-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-secondary-500">Pontuação Geral</h4>
              <div className="flex items-baseline">
                <span className="text-2xl font-semibold text-secondary-900">
                  {results.score.percentage.toFixed(1)}%
                </span>
                <span className="ml-2 text-sm text-secondary-500">
                  ({results.score.correct}/{results.score.total})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Status */}
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-secondary-500">Status</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* Card de Tempo */}
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-secondary-500">Tempo Total</h4>
              <span className="text-2xl font-semibold text-secondary-900">
                {formatTimeSpent(results.timeSpent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Bar data={stageData} options={stageOptions} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </div>
    </div>
  )
}
