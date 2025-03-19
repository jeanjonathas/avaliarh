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
    status: string
    type: string
    testScore?: number
    interviewScore?: number
    interviewNotes?: string
    finalDecision: string
  }>
  skillScores: Array<{
    skill: string
    total: number
    correct: number
    percentage: number
  }>
  completed: boolean
  timeSpent: number
  processStatus: {
    currentStage: string
    overallStatus: string
    cutoffScore?: number
    evaluationType: string
    expectedProfile?: any
  }
  processName?: string
  jobPosition?: string
  observations?: string
  rating?: number
  status: string
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

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Função para traduzir o status
  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'APPROVED': 'Aprovado',
      'PENDING': 'Pendente',
      'REJECTED': 'Reprovado',
      'PENDING_EVALUATION': 'Aguardando Avaliação',
      'IN_PROGRESS': 'Em Andamento',
      'SCORE_BASED': 'Baseado em Pontuação',
      'CUSTOM': 'Personalizado'
    }
    return statusMap[status] || status
  }

  // Função para formatar o tempo
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min`
  }

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

  return (
    <div className="space-y-8">
      <Toaster position="top-right" />

      {/* Cards de resumo de desempenho */}
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
                  {typeof results.score === 'object' 
                    ? results.score.percentage.toFixed(1) 
                    : parseFloat((results.score || 0).toFixed(1))}%</span>
                <span className="ml-2 text-sm text-secondary-500">
                  ({typeof results.score === 'object' 
                    ? `${results.score.correct}/${results.score.total}` 
                    : '0/0'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Status do Teste */}
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-secondary-500">Status do Teste</h4>
              <div className="flex items-baseline">
                <span className="text-2xl font-semibold text-secondary-900">
                  {!results.completed ? 'Pendente' : (() => {
                    const totalCorrect = results.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                    const totalQuestions = results.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                    const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                    
                    if (percentage >= 80) return 'Aprovado';
                    if (percentage >= 60) return 'Consideração';
                    return 'Reprovado';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Tempo Gasto */}
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-amber-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-secondary-500">Tempo Gasto</h4>
              <div className="flex items-baseline">
                <span className="text-2xl font-semibold text-secondary-900">
                  {formatTime(results.timeSpent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cabeçalho do Processo Seletivo */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {results.processName || 'Processo Seletivo'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {results.jobPosition || 'Cargo não especificado'}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(results.processStatus.overallStatus)}`}>
              {translateStatus(results.processStatus.overallStatus)}
            </span>
            <p className="text-sm text-gray-600 mt-1">
              Etapa Atual: {results.processStatus.currentStage}
            </p>
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

      {/* Tabela de Etapas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso por Etapa</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etapa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pontuação
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Decisão
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.stageScores.map((stage, index) => (
                <tr key={stage.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stage.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {translateStatus(stage.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                      {translateStatus(stage.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stage.type === 'TEST' ? (
                      <div className="flex items-center">
                        <span className="mr-2">{stage.percentage.toFixed(1)}%</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stage.percentage >= 80 ? 'bg-green-500' :
                              stage.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${stage.percentage}%` }}
                          />
                        </div>
                      </div>
                    ) : stage.interviewScore ? (
                      `${stage.interviewScore}/10`
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stage.finalDecision)}`}>
                      {translateStatus(stage.finalDecision)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observações */}
      {results.observations && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
          <p className="text-gray-700 whitespace-pre-line">
            {results.observations}
          </p>
        </div>
      )}

      {/* Desempenho por Etapa */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
        <div className="space-y-4">
          {results.stageScores.map((stage) => (
            <div key={stage.id} className="border border-secondary-200 rounded-lg p-4">
              <h4 className="font-medium text-secondary-700 mb-2">{stage.name}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-secondary-500">Total de Questões</p>
                  <p className="font-medium text-secondary-900">{stage.total}</p>
                </div>
                <div>
                  <p className="text-secondary-500">Respostas Corretas</p>
                  <p className="font-medium text-secondary-900">{stage.correct}</p>
                </div>
                <div>
                  <p className="text-secondary-500">Taxa de Acerto</p>
                  <p className="font-medium text-secondary-900">{stage.percentage.toFixed(1)}%</p>
                </div>
              </div>
              {/* Barra de progresso */}
              <div className="mt-3 h-2 bg-secondary-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    stage.percentage >= 80 ? 'bg-green-500' : 
                    stage.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendações baseadas no desempenho */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Recomendações</h3>
        <div className="space-y-4">
          {(() => {
            const totalCorrect = results.stageScores.reduce((acc, stage) => acc + stage.correct, 0);
            const totalQuestions = results.stageScores.reduce((acc, stage) => acc + stage.total, 0);
            const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
            
            if (percentage >= 80) {
              return (
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <h4 className="font-medium text-green-800">Candidato Recomendado</h4>
                  <p className="mt-2 text-green-700">
                    Este candidato demonstrou excelente desempenho na avaliação. Recomendamos prosseguir com o processo de contratação.
                  </p>
                </div>
              );
            } else if (percentage >= 60) {
              return (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <h4 className="font-medium text-yellow-800">Candidato para Consideração</h4>
                  <p className="mt-2 text-yellow-700">
                    Este candidato demonstrou desempenho satisfatório. Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão.
                  </p>
                </div>
              );
            } else {
              return (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <h4 className="font-medium text-red-800">Candidato Não Recomendado</h4>
                  <p className="mt-2 text-red-700">
                    Este candidato não atingiu a pontuação mínima necessária. Recomendamos considerar outros candidatos.
                  </p>
                </div>
              );
            }
          })()}
          
          {/* Áreas para desenvolvimento */}
          <div className="mt-4">
            <h4 className="font-medium text-secondary-800">Áreas para Desenvolvimento:</h4>
            <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
              {results.stageScores.filter(stage => stage.percentage < 60).map(stage => (
                <li key={stage.id}>
                  {stage.name} ({stage.percentage.toFixed(1)}%) - Necessita aprimoramento
                </li>
              ))}
              {results.stageScores.filter(stage => stage.percentage < 60).length === 0 && (
                <li>Não foram identificadas áreas críticas para desenvolvimento.</li>
              )}
            </ul>
          </div>
          
          {/* Pontos fortes */}
          <div className="mt-4">
            <h4 className="font-medium text-secondary-800">Pontos Fortes:</h4>
            <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
              {results.stageScores.filter(stage => stage.percentage >= 80).map(stage => (
                <li key={stage.id}>
                  {stage.name} ({stage.percentage.toFixed(1)}%) - Excelente desempenho
                </li>
              ))}
              {results.stageScores.filter(stage => stage.percentage >= 80).length === 0 && (
                <li>Não foram identificados pontos de excelência.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
