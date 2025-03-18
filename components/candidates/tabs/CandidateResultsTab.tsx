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

export const CandidateResultsTab = ({ candidate }: CandidateResultsTabProps) => {
  if (!candidate.completed) {
    return (
      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
        <p className="mt-2 text-blue-700">
          Este candidato ainda não realizou o teste. Os resultados serão exibidos após a conclusão da avaliação.
        </p>
      </div>
    )
  }

  // Preparar dados para o gráfico de barras de desempenho por etapa
  const stageData = {
    labels: candidate.stageScores?.map(stage => stage.name) || [],
    datasets: [
      {
        label: 'Porcentagem de Acertos',
        data: candidate.stageScores?.map(stage => stage.percentage) || [],
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

  // Calcular estatísticas gerais
  const totalCorrect = candidate.score?.correct || 0
  const totalQuestions = candidate.score?.total || 0
  const overallPercentage = candidate.score?.percentage.toFixed(1) || '0'

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

  return (
    <div className="space-y-8">
      {/* Resumo do Desempenho */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pontuação Geral</h3>
          <div className="flex items-center">
            <span className="text-3xl font-bold text-blue-600">{overallPercentage}%</span>
            <div className="ml-4 flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    getStatusInfo(Number(overallPercentage)).progressColor
                  }`}
                  style={{ width: `${overallPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Questões Corretas</h3>
          <div className="flex items-center">
            <span className="text-3xl font-bold text-green-600">{totalCorrect}</span>
            <span className="text-gray-500 ml-2">/ {totalQuestions}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
            candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {candidate.status === 'APPROVED' ? 'Aprovado' :
             candidate.status === 'REJECTED' ? 'Rejeitado' :
             'Pendente'}
          </span>
        </div>
      </div>

      {/* Gráfico de Desempenho por Etapa */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Desempenho por Etapa</h3>
        <div className="h-80">
          <Bar data={stageData} options={stageOptions} />
        </div>
      </div>

      {/* Tabela Detalhada de Resultados */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhamento por Etapa</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Etapa
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acertos
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Desempenho
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidate.stageScores?.map((stage, index) => {
              const statusInfo = getStatusInfo(stage.percentage)
              return (
                <tr key={stage.id || index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stage.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stage.correct}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stage.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-2">{stage.percentage.toFixed(1)}%</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${statusInfo.progressColor}`}
                          style={{ width: `${stage.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Recomendação */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendação</h3>
        {(() => {
          if (Number(overallPercentage) >= 80) {
            return (
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <h4 className="font-medium text-green-800">Candidato Recomendado</h4>
                <p className="mt-2 text-green-700">
                  Este candidato demonstrou excelente desempenho na avaliação. Recomendamos prosseguir com o processo de contratação.
                </p>
              </div>
            )
          } else if (Number(overallPercentage) >= 60) {
            return (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <h4 className="font-medium text-yellow-800">Candidato para Consideração</h4>
                <p className="mt-2 text-yellow-700">
                  Este candidato demonstrou desempenho satisfatório. Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão.
                </p>
              </div>
            )
          } else {
            return (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <h4 className="font-medium text-red-800">Candidato Não Recomendado</h4>
                <p className="mt-2 text-red-700">
                  Este candidato não atingiu a pontuação mínima necessária. Recomendamos considerar outros candidatos.
                </p>
              </div>
            )
          }
        })()}
      </div>
    </div>
  )
}
