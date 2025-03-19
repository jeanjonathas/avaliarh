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
import { Bar, Radar, Pie, Doughnut } from 'react-chartjs-2'
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

interface PersonalityTrait {
  trait: string;
  count: number;
  percentage: number;
  weight?: number;
  weightedScore?: number;
}

interface PersonalityAnalysis {
  dominantPersonality: PersonalityTrait;
  allPersonalities: PersonalityTrait[];
  totalResponses: number;
  hasTraitWeights?: boolean;
  weightedScore?: number;
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

interface PerformanceSummary {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  multipleChoiceScore?: number;
  opinionScore?: number;
  overallScore?: number;
}

interface StagePerformance {
  stageId: string;
  stageName: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  weight: number;
  stageType: 'MULTIPLE_CHOICE' | 'OPINION_MULTIPLE';
  avgTimePerQuestion?: number;
  totalTime?: number;
}

interface Performance {
  summary: PerformanceSummary;
  stagePerformance: StagePerformance[];
  personalityAnalysis?: PersonalityAnalysis;
  opinionQuestionsCount: number;
  multipleChoiceQuestionsCount: number;
  showResults: boolean;
  avgTimePerQuestion: number;
}

interface CandidatePerformance {
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
    multipleChoiceScore?: number;
    opinionScore?: number;
    overallScore?: number;
  };
  stagePerformance: Array<{
    stageId: string;
    stageName: string;
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
    weight: number;
    stageType: 'MULTIPLE_CHOICE' | 'OPINION_MULTIPLE';
    avgTimePerQuestion?: number;
    totalTime?: number;
  }>;
  personalityAnalysis?: PersonalityAnalysis;
  opinionQuestionsCount: number;
  multipleChoiceQuestionsCount: number;
  avgTimePerQuestion: number;
  totalTime: number;
  testStartTime?: Date;
  testEndTime?: Date;
  showResults: boolean;
}

export const CandidateResultsTab = ({ candidate }: CandidateResultsTabProps) => {
  const [results, setResults] = useState<CandidateResults | null>(null)
  const [performance, setPerformance] = useState<CandidatePerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPerformance, setLoadingPerformance] = useState(true)

  // Dados para os gráficos
  const [stagePerformanceData, setStagePerformanceData] = useState<any>(null);
  const [personalityRadarData, setPersonalityRadarData] = useState<any>(null);

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

    const fetchPerformance = async () => {
      try {
        setLoadingPerformance(true)
        const response = await fetch(`/api/admin/candidates/${candidate.id}/performance`, {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Erro ao buscar desempenho')
        }

        const data = await response.json()
        console.log('Dados de performance recebidos:', data);
        
        // Verificar se os dados de desempenho por etapa estão corretos
        if (data.stagePerformance) {
          console.log(`Número de etapas recebidas: ${data.stagePerformance.length}`);
          
          // Filtrar explicitamente para garantir que apenas etapas de múltipla escolha sejam exibidas
          data.stagePerformance = data.stagePerformance.filter((stage: any) => 
            stage.stageType === 'MULTIPLE_CHOICE' && stage.totalQuestions > 0
          );
          
          // Preparar dados para o gráfico de barras de desempenho por etapa
          const stageLabels = data.stagePerformance.map((stage: any) => stage.stageName);
          const stageAccuracies = data.stagePerformance.map((stage: any) => stage.accuracy);
          
          setStagePerformanceData({
            labels: stageLabels,
            datasets: [
              {
                label: 'Acertos (%)',
                data: stageAccuracies,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
              }
            ]
          });
        }
        
        // Preparar dados para o gráfico de radar de personalidade
        if (data.personalityAnalysis && data.personalityAnalysis.allPersonalities) {
          const personalityLabels = data.personalityAnalysis.allPersonalities.map((p: any) => p.trait);
          const personalityValues = data.personalityAnalysis.allPersonalities.map((p: any) => p.percentage);
          
          setPersonalityRadarData({
            labels: personalityLabels,
            datasets: [
              {
                label: 'Perfil de Personalidade',
                data: personalityValues,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
              }
            ]
          });
        }
        
        setPerformance(data)
      } catch (error) {
        console.error('Erro ao buscar desempenho:', error)
        toast.error('Não foi possível carregar os dados de desempenho')
      } finally {
        setLoadingPerformance(false)
      }
    }

    if (candidate?.id) {
      fetchResults()
      fetchPerformance()
    }
  }, [candidate])

  // Processar dados de personalidade para o gráfico de radar
  useEffect(() => {
    if (performance?.personalityAnalysis?.allPersonalities && candidate?.responses) {
      // Extrair todos os traços de personalidade possíveis das perguntas opinativas do teste
      const allPossibleTraits: string[] = [];
      
      // Verificar se temos acesso às respostas completas do candidato
      if (candidate.responses) {
        // Filtrar apenas as perguntas opinativas
        const opinionResponses = candidate.responses.filter(response => {
          // Verificar se é uma pergunta opinativa com base no snapshot
          if (response.questionSnapshot && typeof response.questionSnapshot === 'object') {
            const options = response.questionSnapshot.options || [];
            // Verificar se a pergunta tem opções com personalidade
            const hasPersonalityOptions = options.some((opt: any) => 
              (opt.text && (opt.text.includes('(') && opt.text.includes(')'))) || opt.categoryName
            );
            
            // Verificar se a pergunta não tem opções corretas/incorretas
            const hasNoCorrectOptions = options.every((opt: any) => opt.isCorrect !== true);
            
            return hasPersonalityOptions || hasNoCorrectOptions;
          }
          return false;
        });
        
        // Extrair todos os traços de personalidade possíveis das opções
        opinionResponses.forEach(response => {
          if (response.questionSnapshot && typeof response.questionSnapshot === 'object') {
            const options = response.questionSnapshot.options || [];
            options.forEach((option: any) => {
              let trait = option.categoryName;
              
              // Se não houver categoryName, tentar extrair do texto (entre parênteses)
              if (!trait && option.text) {
                const match = option.text.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                  trait = match[1].trim();
                }
              }
              
              // Adicionar o traço à lista se ainda não estiver presente
              if (trait && !allPossibleTraits.includes(trait)) {
                allPossibleTraits.push(trait);
              }
            });
          }
        });
      }
      
      // Se não conseguimos extrair traços das perguntas, usar os traços que já temos na análise
      if (allPossibleTraits.length === 0) {
        performance.personalityAnalysis.allPersonalities.forEach(trait => {
          if (!allPossibleTraits.includes(trait.trait)) {
            allPossibleTraits.push(trait.trait);
          }
        });
      }
      
      console.log('Traços de personalidade possíveis:', allPossibleTraits);
      
      // Criar um mapa com todos os traços possíveis inicializados com 0%
      const traitMap: Record<string, number> = {};
      allPossibleTraits.forEach(trait => {
        traitMap[trait] = 0;
      });
      
      // Preencher com os valores reais dos traços que o candidato possui
      performance.personalityAnalysis.allPersonalities.forEach(trait => {
        traitMap[trait.trait] = trait.percentage;
      });
      
      // Converter o mapa em arrays para o gráfico
      const labels = Object.keys(traitMap);
      const data = Object.values(traitMap);
      
      setPersonalityRadarData({
        labels,
        datasets: [
          {
            label: 'Traços de Personalidade',
            data,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(255, 99, 132)'
          }
        ]
      });
    }
  }, [performance, candidate]);

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
    if (minutes < 1/60) {
      // Menos de 1 segundo
      return '< 1 segundo'
    }
    
    if (minutes < 1) {
      // Menos de 1 minuto, mostrar em segundos
      const seconds = Math.round(minutes * 60)
      return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.floor(minutes % 60)
    const seconds = Math.round((minutes * 60) % 60)
    
    let timeString = ''
    
    if (hours > 0) {
      timeString += `${hours}h `
    }
    
    if (remainingMinutes > 0 || (hours > 0 && seconds > 0)) {
      timeString += `${remainingMinutes}min `
    }
    
    if (seconds > 0 && hours === 0) {
      timeString += `${seconds}s`
    }
    
    return timeString.trim()
  }

  if (loading && loadingPerformance) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <Toaster position="top-right" />
            {/* Cabeçalho do Processo Seletivo */}
            <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {results?.processName || 'Processo Seletivo'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {results?.jobPosition || 'Cargo não especificado'}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(results?.processStatus?.overallStatus)}`}>
              {translateStatus(results?.processStatus?.overallStatus)}
            </span>
            <p className="text-sm text-gray-600 mt-1">
              Etapa Atual: {results?.processStatus?.currentStage}
            </p>
          </div>
        </div>
      </div>
      
      {/* Seção de Desempenho do Candidato */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Desempenho do Candidato</h2>
        
        {loadingPerformance ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : performance ? (
          <>
            {performance.showResults === true ? (
              <div className="space-y-6">
                {/* Resumo de Pontuação */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pontuação Geral */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Pontuação Geral</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-primary-600">
                        {performance.summary.overallScore !== undefined 
                          ? `${performance.summary.overallScore.toFixed(1)}%` 
                          : 'N/A'}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        Combinação ponderada de múltipla escolha e perfil
                      </div>
                    </div>
                  </div>
                  
                  {/* Pontuação de Múltipla Escolha */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Múltipla Escolha</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {performance.summary.multipleChoiceScore !== undefined && performance.multipleChoiceQuestionsCount > 0
                          ? `${performance.summary.multipleChoiceScore.toFixed(1)}%` 
                          : 'N/A'}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        {performance.multipleChoiceQuestionsCount} perguntas
                      </div>
                    </div>
                  </div>
                  
                  {/* Pontuação de Perfil */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Perfil de Personalidade</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-green-600">
                        {performance.summary.opinionScore !== undefined && performance.opinionQuestionsCount > 0
                          ? `${performance.summary.opinionScore.toFixed(1)}%` 
                          : 'N/A'}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        {performance.opinionQuestionsCount} perguntas
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estatísticas Detalhadas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gráfico de Barras de Desempenho por Etapa */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Desempenho por Etapa</h3>
                    {performance.stagePerformance && performance.stagePerformance.length > 0 ? (
                      <div className="h-64">
                        <Bar 
                          data={stagePerformanceData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top' as const,
                              },
                              title: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                                title: {
                                  display: true,
                                  text: 'Acertos (%)'
                                }
                              }
                            }
                          }} 
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-40 text-gray-500">
                        Não há dados de desempenho por etapa disponíveis
                      </div>
                    )}
                  </div>

                  {/* Gráfico de Radar de Personalidade */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Perfil de Personalidade</h3>
                    {performance.personalityAnalysis && performance.personalityAnalysis.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 ? (
                      <div className="h-64">
                        <Radar 
                          data={personalityRadarData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              r: {
                                angleLines: {
                                  display: true
                                },
                                suggestedMin: 0,
                                suggestedMax: 100
                              }
                            },
                            plugins: {
                              legend: {
                                display: false
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `${context.label}: ${context.raw}%`;
                                  }
                                }
                              }
                            }
                          }} 
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-40 text-gray-500">
                        Não há dados de personalidade disponíveis
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabela de Traços de Personalidade com Pesos */}
                {performance.personalityAnalysis && performance.personalityAnalysis.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Detalhamento de Traços de Personalidade</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Traço de Personalidade
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Porcentagem
                            </th>
                            {performance.personalityAnalysis.hasTraitWeights && (
                              <>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Peso
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Pontuação Ponderada
                                </th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {performance.personalityAnalysis.allPersonalities.map((trait, index) => (
                            <tr key={index} className={index === 0 ? "bg-green-50" : ""}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {trait.trait} {index === 0 && <span className="text-xs text-green-600 font-medium ml-1">(Dominante)</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {trait.percentage}%
                              </td>
                              {performance.personalityAnalysis?.hasTraitWeights && (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trait.weight || 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {trait.weightedScore?.toFixed(1) || (trait.percentage).toFixed(1)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Estatísticas de Tempo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tempo Total</h3>
                    <div className="text-2xl font-bold text-gray-800">
                      {formatTime(performance.totalTime)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tempo calculado com base nas respostas
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tempo Médio por Questão</h3>
                    <div className="text-2xl font-bold text-gray-800">
                      {formatTime(performance.avgTimePerQuestion)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Média de tempo gasto em cada questão
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Conclusão do Teste</h3>
                    <div className="text-2xl font-bold text-gray-800">
                      {performance.testEndTime ? new Date(performance.testEndTime).toLocaleString('pt-BR') : 'Não concluído'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Data e hora de conclusão do teste
                    </p>
                  </div>
                </div>

                {/* Card de informação sobre o cálculo de tempo */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                  <div className="flex items-start">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Sobre o cálculo de tempo</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        O tempo total é calculado somando o tempo gasto em cada questão. Isso pode diferir do tempo entre o início e o fim do teste, 
                        pois considera apenas o tempo ativo de resposta, ignorando pausas ou períodos de inatividade.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Os resultados deste teste não estão configurados para serem exibidos ao candidato.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
            Não há dados de desempenho disponíveis para este candidato
          </div>
        )}
      </div>


      {/* Seção de Desempenho */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Desempenho em Perguntas de Múltipla Escolha</h3>
          
          {loadingPerformance ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : performance && performance.summary ? (
            performance.showResults === true ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-secondary-500">Total de Questões</p>
                        <p className="text-xl font-semibold text-secondary-900">{performance.summary.totalQuestions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100 text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-secondary-500">Respostas Corretas</p>
                        <p className="text-xl font-semibold text-secondary-900">{performance.summary.correctAnswers}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-secondary-500">Taxa de Acerto</p>
                        <p className="text-xl font-semibold text-secondary-900">{typeof performance.summary.accuracy === 'number' ? performance.summary.accuracy.toFixed(1) : '0'}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {performance.stagePerformance && performance.stagePerformance.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Desempenho por Etapa (Apenas Múltipla Escolha)</h3>
                    <div className="space-y-4">
                      {performance.stagePerformance.map((stage: any) => (
                        <div key={stage.stageId} className="bg-white p-4 rounded-lg shadow border">
                          <h4 className="font-medium text-gray-900 mb-2">{stage.stageName}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Total de Questões</p>
                              <p className="font-semibold">{stage.totalQuestions}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Corretas</p>
                              <p className="font-semibold text-green-600">{stage.correctAnswers}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Incorretas</p>
                              <p className="font-semibold text-red-600">{stage.incorrectAnswers}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Taxa de Acerto</p>
                              <p className="font-semibold">{typeof stage.accuracy === 'number' ? stage.accuracy.toFixed(1) : '0'}%</p>
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${stage.accuracy}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <p className="text-yellow-700">
                  A exibição dos resultados de desempenho não está habilitada para este teste.
                </p>
              </div>
            )
          ) : (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <p className="text-yellow-700">
                Não foram encontrados dados de desempenho para este candidato.
              </p>
            </div>
          )}
        </div>
      </div>  

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seção removida - substituída pelos novos gráficos abaixo */}
      </div>

      {/* Gráficos de Desempenho (Múltipla Escolha) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Desempenho em Perguntas de Múltipla Escolha</h3>
        
        {performance?.stagePerformance && performance.stagePerformance.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Barras */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Desempenho por Etapa (Barras)</h4>
              <Bar data={{
                labels: performance.stagePerformance.map(stage => stage.stageName),
                datasets: [
                  {
                    label: 'Porcentagem de Acertos',
                    data: performance.stagePerformance.map(stage => stage.accuracy),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                  }
                ]
              }} options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
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
              }} />
            </div>
            
            {/* Gráfico de Radar */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Desempenho por Etapa (Radar)</h4>
              <Radar data={{
                labels: performance.stagePerformance.map(stage => stage.stageName),
                datasets: [
                  {
                    label: 'Desempenho por Etapa',
                    data: performance.stagePerformance.map(stage => stage.accuracy),
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(59, 130, 246)'
                  }
                ]
              }} options={{
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
                  }
                }
              }} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Não há dados de desempenho por etapa disponíveis</p>
            <p className="text-sm mt-2">O candidato não respondeu perguntas de múltipla escolha ou os dados não foram processados corretamente</p>
          </div>
        )}
      </div>

      {/* Gráfico de Análise de Personalidade */}
      {performance?.personalityAnalysis && performance.personalityAnalysis.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Análise de Personalidade (Perguntas Opinativas)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de pizza para personalidades */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Distribuição de Personalidade</h4>
              <Pie data={{
                labels: performance.personalityAnalysis.allPersonalities.map(p => p.trait),
                datasets: [
                  {
                    data: performance.personalityAnalysis.allPersonalities.map(p => p.percentage),
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.5)',
                      'rgba(54, 162, 235, 0.5)',
                      'rgba(255, 206, 86, 0.5)',
                      'rgba(75, 192, 192, 0.5)',
                      'rgba(153, 102, 255, 0.5)',
                      'rgba(255, 159, 64, 0.5)',
                      'rgba(199, 199, 199, 0.5)',
                      'rgba(83, 102, 255, 0.5)',
                      'rgba(40, 159, 64, 0.5)',
                      'rgba(210, 199, 199, 0.5)',
                    ],
                    borderColor: [
                      'rgba(255, 99, 132, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(255, 206, 86, 1)',
                      'rgba(75, 192, 192, 1)',
                      'rgba(153, 102, 255, 1)',
                      'rgba(255, 159, 64, 1)',
                      'rgba(199, 199, 199, 1)',
                      'rgba(83, 102, 255, 1)',
                      'rgba(40, 159, 64, 1)',
                      'rgba(210, 199, 199, 1)',
                    ],
                    borderWidth: 1,
                  },
                ],
              }} options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right' as const,
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw as number;
                        return `${label}: ${value}%`;
                      }
                    }
                  }
                },
              }} />
            </div>

            {/* Gráfico de radar para personalidades */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Radar de Traços de Personalidade</h4>
              {personalityRadarData && (
                <Radar data={personalityRadarData} options={{
                  responsive: true,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        stepSize: 20
                      },
                      pointLabels: {
                        font: {
                          size: 11
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.dataset.label || '';
                          const value = context.raw as number;
                          return `${label}: ${value}%`;
                        }
                      }
                    }
                  }
                }} />
              )}
            </div>
          </div>

          {/* Tabela de Personalidades */}
          <div className="mt-8">
            <h4 className="text-md font-medium text-gray-700 mb-4">Detalhamento de Traços de Personalidade</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Traço de Personalidade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porcentagem
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contagem
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {performance.personalityAnalysis.allPersonalities.map((personality, index) => (
                    <tr key={index} className={index === 0 ? "bg-blue-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {personality.trait} {index === 0 && <span className="text-xs text-blue-600 ml-2">(Dominante)</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${personality.percentage}%` }}></div>
                          </div>
                          <span className="ml-2">{personality.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {personality.count} respostas
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Personalidade Dominante */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-md font-medium text-gray-700 mb-2">Personalidade Dominante</h4>
            <p className="text-lg font-semibold text-blue-800">
              {performance.personalityAnalysis.dominantPersonality.trait} 
              <span className="text-sm font-normal text-blue-600 ml-2">
                ({performance.personalityAnalysis.dominantPersonality.percentage}%)
              </span>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Baseado em {performance.personalityAnalysis.totalResponses} respostas de perguntas opinativas.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Análise de Personalidade</h3>
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Não há dados de personalidade disponíveis</p>
            <p className="text-sm mt-2">O candidato não respondeu perguntas opinativas ou os dados não foram processados corretamente</p>
          </div>
        </div>
      )}         

      {/* Recomendações baseadas no desempenho */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Recomendações</h3>
        <div className="space-y-4">
          {(() => {
            const totalCorrect = results?.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
            const totalQuestions = results?.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
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
              {results?.stageScores?.filter(stage => stage.percentage < 60).map(stage => (
                <li key={stage.id}>
                  {stage.name} ({stage.percentage !== null && stage.percentage !== undefined ? stage.percentage.toFixed(1) : '0'}%) - Necessita aprimoramento
                </li>
              ))}
              {results?.stageScores?.filter(stage => stage.percentage < 60).length === 0 && (
                <li>Não foram identificadas áreas críticas para desenvolvimento.</li>
              )}
            </ul>
          </div>
          
          {/* Pontos fortes */}
          <div className="mt-4">
            <h4 className="font-medium text-secondary-800">Pontos Fortes:</h4>
            <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
              {results?.stageScores?.filter(stage => stage.percentage >= 80).map(stage => (
                <li key={stage.id}>
                  {stage.name} ({stage.percentage !== null && stage.percentage !== undefined ? stage.percentage.toFixed(1) : '0'}%) - Excelente desempenho
                </li>
              ))}
              {results?.stageScores?.filter(stage => stage.percentage >= 80).length === 0 && (
                <li>Não foram identificados pontos de excelência.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}