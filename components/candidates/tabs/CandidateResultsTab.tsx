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

  // Dados para o gráfico de radar
  const radarData = {
    labels: [
      'Raciocínio Lógico',
      'Matemática Básica',
      'Compreensão Verbal',
      'Aptidão Espacial',
      'Tomada de Decisão',
      'Gestão de Tempo e Produtividade',
      'Situações de Crise',
      'Comunicação',
      'Soft Skills',
      'Carreira'
    ],
    datasets: [
      {
        label: 'Desempenho do Candidato',
        data: candidate.stageScores?.map(stage => stage.percentage) || [],
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cards de resumo de desempenho */}
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
                              {typeof candidate.score === 'object' 
                                ? candidate.score.percentage 
                                : parseFloat((candidate.score || 0).toFixed(1))}%</span>
                            <span className="ml-2 text-sm text-secondary-500">
                              ({typeof candidate.score === 'object' 
                                ? `${candidate.score.correct}/${candidate.score.total}` 
                                : '0/0'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
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
                              {!candidate.completed ? 'Pendente' : (() => {
                                const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
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
                              {formatTime(candidate.timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gráfico de Radar - Desempenho por Habilidade */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Habilidade</h3>
                    {candidate.stageScores && candidate.stageScores.length > 0 ? (
                      <div className="h-80">
                        <Radar data={radarData} options={radarOptions} />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Este gráfico mostra o desempenho percentual do candidato em cada etapa de avaliação.</p>
                    </div>
                  </div>
                  
                  {/* Gráfico de Barras - Desempenho por Etapa */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
                    {candidate.stageScores && candidate.stageScores.length > 0 ? (
                      <div className="h-80">
                        <Bar data={barData} options={barOptions} />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Este gráfico mostra o número de respostas corretas em comparação com o total de questões em cada etapa.</p>
                    </div>
                  </div>
                  
                  {/* Tabela de Desempenho Detalhado */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho Detalhado</h3>
                    {!candidate.completed ? (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-blue-700">
                          O candidato ainda não realizou o teste. Os dados de desempenho estarão disponíveis após a conclusão da avaliação.
                        </p>
                      </div>
                    ) : !candidate.stageScores || candidate.stageScores.length === 0 ? (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato, mesmo tendo completado o teste.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                          <thead className="bg-secondary-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Etapa
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Corretas
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Percentual
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-secondary-200">
                            {candidate.stageScores?.map((stage, index) => (
                              <tr key={stage.id} className={index % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                  {stage.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  {stage.correct}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  {stage.total}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  <div className="flex items-center">
                                    <span className="mr-2">{parseFloat(stage.percentage.toFixed(1))}%</span>
                                    <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                      <div 
                                        className={`h-2.5 rounded-full ${
                                          stage.percentage >= 80 ? 'bg-green-500' : 
                                          stage.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${stage.percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {!candidate.completed ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                      Aguardando Respostas
                                    </span>
                                  ) : stage.percentage >= 80 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      Excelente
                                    </span>
                                  ) : stage.percentage >= 60 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Satisfatório
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                      Precisa Melhorar
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            
                            {/* Linha de pontuação geral */}
                            <tr className="bg-secondary-100">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                <strong>Pontuação Geral</strong>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                {candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                {candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                <div className="flex items-center">
                                  {/* Calcular a porcentagem geral com base nos acertos e total de questões */}
                                  {(() => {
                                    const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                    const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                    const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                    return (
                                      <>
                                        <span className="mr-2">{percentage}%</span>
                                        <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                          <div 
                                            className={`h-2.5 rounded-full ${
                                              percentage >= 80 ? 'bg-green-500' : 
                                              percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                          ></div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {!candidate.completed ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Aguardando Respostas
                                  </span>
                                ) : (() => {
                                  const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                  const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                  const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                  
                                  if (percentage >= 80) {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Aprovado
                                      </span>
                                    );
                                  } else if (percentage >= 60) {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        Consideração
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Reprovado
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* Recomendações baseadas no desempenho */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Recomendações</h3>
                    <div className="space-y-4">
                      {!candidate.completed ? (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
                          <p className="mt-2 text-blue-700">
                            Este candidato ainda não realizou o teste. As recomendações serão geradas após a conclusão da avaliação.
                          </p>
                        </div>
                      ) : (() => {
                        // Calcular a porcentagem geral com base nos acertos e total de questões
                        const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                        const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
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
                      })()
                      }
                      
                      {/* Áreas para desenvolvimento */}
                      {candidate.completed && (
                        <div className="mt-4">
                          <h4 className="font-medium text-secondary-800">Áreas para Desenvolvimento:</h4>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
                            {candidate.stageScores?.filter(stage => stage.percentage < 60).map(stage => (
                              <li key={stage.id}>
                                {stage.name} ({stage.percentage}%) - Necessita aprimoramento
                              </li>
                            ))}
                            {candidate.stageScores?.filter(stage => stage.percentage < 60).length === 0 && (
                              <li>Não foram identificadas áreas críticas para desenvolvimento.</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {/* Pontos fortes */}
                      {candidate.completed && (
                        <div className="mt-4">
                          <h4 className="font-medium text-secondary-800">Pontos Fortes:</h4>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
                            {candidate.stageScores?.filter(stage => stage.percentage >= 80).map(stage => (
                              <li key={stage.id}>
                                {stage.name} ({stage.percentage}%) - Excelente desempenho
                              </li>
                            ))}
                            {candidate.stageScores?.filter(stage => stage.percentage >= 80).length === 0 && (
                              <li>Não foram identificados pontos de excelência.</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
  )
}
