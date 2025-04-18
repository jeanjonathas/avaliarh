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
import CandidateCompatibilityChart from '../compatibility/CandidateCompatibilityChart'
import PersonalityRadarChart from '../charts/PersonalityRadarChart'

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

interface PersonalityAnalysis {
  dominantPersonalities: PersonalityTrait[];
  dominantPersonalitiesByGroup: Record<string, PersonalityTrait>;
  allPersonalities: PersonalityTrait[];
  totalResponses: number;
  hasTraitWeights?: boolean;
  weightedScore?: number;
  processPersonalityData?: {
    groups: Array<{
      id: string;
      name: string;
      traits: Array<{
        name: string;
        weight: number;
        categoryNameUuid?: string;
      }>;
      expectedProfile?: Record<string, number>;
    }>;
  };
}

interface CandidateResults {
  score: {
    total: number
    correct: number
    percentage: number
  }
  opinionScore?: number
  multipleChoiceResponses?: number
  opinionResponses?: number
  personalityData?: any
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
    multipleChoiceScore: number;
    opinionScore: number;
    overallScore: number;
  };
  stagePerformance: Array<{
    stageId: string;
    stageName: string;
    stageType: string;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
  }>;
  personalityAnalysis: PersonalityAnalysis;
  opinionQuestionsCount: number;
  multipleChoiceQuestionsCount: number;
  avgTimePerQuestion: number;
  totalTime: number;
  testStartTime: string;
  testEndTime: string;
  showResults: boolean;
  processPersonalityData?: {
    groups: Array<{
      id: string;
      name: string;
      traits: Array<{
        name: string;
        weight: number;
        categoryNameUuid?: string;
      }>;
      expectedProfile?: Record<string, number>;
    }>;
  };
}

interface PersonalityTrait {
  trait: string;
  count: number;
  percentage: number;
  globalPercentage?: number;
  weight?: number;
  weightedScore?: number;
  categoryNameUuid?: string;
  groupId?: string;
  groupName?: string;
}

export const CandidateResultsTab = ({ candidate }: CandidateResultsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [results, setResults] = useState<CandidateResults | null>(null)
  const [performance, setPerformance] = useState<CandidatePerformance | null>(null)
  
  // Dados para os gráficos
  const [stagePerformanceData, setStagePerformanceData] = useState<any>(null);
  const [personalityRadarData, setPersonalityRadarData] = useState<any>(null);
  const [allRadarData, setAllRadarData] = useState<any[]>([]);

  // Variáveis para armazenar os dados de compatibilidade calculados pelo CandidateCompatibilityChart
  const [targetProfile, setTargetProfile] = useState<string>('');
  const [profileMatchPercentage, setProfileMatchPercentage] = useState<number>(0);
  const [compatibilityScore, setCompatibilityScore] = useState<number>(0);
  const [profileMatch, setProfileMatch] = useState<boolean>(false);

  // Estado para controlar a tab ativa do gráfico de personalidade
  const [activePersonalityTab, setActivePersonalityTab] = useState<string>('all');
  const [activeRadarIndex, setActiveRadarIndex] = useState<number>(0);

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
        console.log('Dados de desempenho completos:', JSON.stringify(data, null, 2));
        console.log('Tempo total (API):', data.totalTime);
        console.log('Tempo total em segundos (API):', data.totalTime);
        console.log('Tempo médio por questão (API):', data.avgTimePerQuestion);
        
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
    if (performance?.personalityAnalysis?.allPersonalities) {
      console.log('Processando dados para o gráfico de radar de personalidade');
      
      // Criar um gráfico simples com todos os traços
      const personalityLabels = performance.personalityAnalysis.allPersonalities.map(p => p.trait);
      const personalityValues = performance.personalityAnalysis.allPersonalities.map(p => p.percentage);
      
      const simpleRadarData = {
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
      };
      
      console.log('Dados do radar simples:', simpleRadarData);
      setPersonalityRadarData(simpleRadarData);
      setAllRadarData([simpleRadarData]);
      
      // Verificar se os traços têm informações de grupo
      const hasGroupInfo = performance.personalityAnalysis.allPersonalities.some(trait => 
        trait.groupId && trait.groupName
      );
      
      if (hasGroupInfo) {
        console.log('Traços têm informações de grupo, criando gráficos por grupo');
        
        // Agrupar traços por grupo
        const traitsByGroup: Record<string, PersonalityTrait[]> = {};
        
        performance.personalityAnalysis.allPersonalities.forEach(trait => {
          if (trait.groupId) {
            if (!traitsByGroup[trait.groupId]) {
              traitsByGroup[trait.groupId] = [];
            }
            traitsByGroup[trait.groupId].push(trait);
          }
        });
        
        // Criar um gráfico para cada grupo
        const groupDatasets: any[] = [simpleRadarData]; // Começar com o gráfico de todos os traços
        
        Object.entries(traitsByGroup).forEach(([groupId, traits]) => {
          const groupName = traits[0]?.groupName || `Grupo ${groupId}`;
          const groupLabels = traits.map(t => t.trait);
          const groupValues = traits.map(t => t.percentage);
          
          const groupData = {
            labels: groupLabels,
            datasets: [
              {
                label: groupName,
                data: groupValues,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
              }
            ]
          };
          
          groupDatasets.push(groupData);
        });
        
        console.log('Dados dos gráficos por grupo:', groupDatasets);
        setAllRadarData(groupDatasets);
      }
    }
  }, [performance]);

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
  const formatTime = (seconds: number) => {
    // Verificar se o valor é válido (incluindo zero)
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return 'N/A';
    }
    
    // Para zero segundos, mostrar "0s"
    if (seconds === 0) {
      return '0s';
    }
    
    if (seconds < 1) {
      // Menos de 1 segundo
      return '< 1 segundo';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let timeString = '';
    
    if (hours > 0) {
      timeString += `${hours}h `;
    }
    
    if (minutes > 0 || hours > 0) {
      timeString += `${minutes}min `;
    }
    
    // Sempre mostrar segundos se não houver horas ou minutos, ou se houver segundos
    if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
      timeString += `${remainingSeconds}s`;
    }
    
    return timeString.trim();
  }

  if (loading && loadingPerformance) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Função para atualizar os dados de compatibilidade quando o cálculo for concluído
  const updateCompatibilityData = (score: number, calculatedTargetProfile: string = '', calculatedMatchPercentage: number = 0) => {
    setCompatibilityScore(score);
    
    if (calculatedTargetProfile) {
      setTargetProfile(calculatedTargetProfile);
      setProfileMatchPercentage(calculatedMatchPercentage);
      setProfileMatch(performance?.personalityAnalysis?.dominantPersonalities?.some(p => p.trait === calculatedTargetProfile));
      
      // Atualizar o texto da recomendação com os novos valores
      updateRecommendationText(score, calculatedTargetProfile, calculatedMatchPercentage);
    }
  };

  // Função para atualizar o texto da recomendação
  const updateRecommendationText = (score: number, targetProfile: string, profileMatchPercentage: number) => {
    const recommendationElement = document.getElementById('recommendation-text');
    if (!recommendationElement) return;
    
    let text = `Este candidato demonstrou excelente desempenho técnico com ${performance?.summary?.accuracy?.toFixed(1)}% de acertos. `;
    
    if (performance?.personalityAnalysis?.dominantPersonalities) {
      text += `Seu perfil dominante é &ldquo;${performance.personalityAnalysis.dominantPersonalities.map(p => p.trait).join(', ')}&rdquo; (${performance.personalityAnalysis.dominantPersonalities.map(p => p.percentage).join(', ')}%), `;
      text += 'o que complementa suas habilidades técnicas. ';
      
      // Adicionar informações sobre o perfil procurado
      if (performance.personalityAnalysis.hasTraitWeights && targetProfile) {
        text += `\n\nO perfil procurado para esta vaga é &ldquo;${targetProfile}&rdquo; `;
        
        if (profileMatch) {
          text += `e o candidato demonstra forte alinhamento com este perfil (${profileMatchPercentage.toFixed(1)}%). `;
          text += `Esta correspondência de perfil, combinada com o excelente desempenho técnico, torna este candidato altamente recomendado para a posição. `;
        } else {
          // Verificar se o perfil procurado está entre os perfis do candidato
          const targetProfileInCandidate = performance.personalityAnalysis.allPersonalities.find(p => p.trait === targetProfile);
          if (targetProfileInCandidate && targetProfileInCandidate.percentage > 30) {
            text += `e, embora o perfil dominante do candidato seja diferente, ele demonstra características significativas deste perfil (${targetProfileInCandidate.percentage.toFixed(1)}%). `;
            text += `Considerando seu excelente desempenho técnico, recomendamos prosseguir com o processo de contratação. `;
          } else {
            text += `enquanto o perfil dominante do candidato é diferente. Isto pode indicar uma abordagem alternativa, mas potencialmente valiosa para a função. `;
            text += `Recomendamos avaliar durante a entrevista se esta diferença de perfil pode trazer diversidade positiva para a equipe. `;
          }
        }
        
        text += `\n\nCompatibilidade Geral: ${score.toFixed(1)}%`;
      } else {
        text += 'Recomendamos prosseguir com o processo de contratação. ';
      }
    } else {
      text += 'Recomendamos prosseguir com o processo de contratação. ';
    }
    
    recommendationElement.innerHTML = text;
  };

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
                          : results?.opinionScore !== undefined && results?.score?.percentage !== undefined
                            ? `${((Number(results.opinionScore) + Number(results.score.percentage)) / 2).toFixed(1)}%`
                            : results?.opinionScore !== undefined
                              ? `${results.opinionScore.toFixed(1)}%`
                              : results?.score?.percentage !== undefined
                                ? `${results.score.percentage.toFixed(1)}%`
                                : 'N/A'}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        Combinação ponderada de múltipla escolha e perfil
                      </div>
                    </div>
                    {results?.personalityData && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Cálculo conforme manual:</span> Média dos pesos dos traços dominantes de cada grupo
                      </div>
                    )}
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
                        {performance.personalityAnalysis?.weightedScore !== undefined && performance.opinionQuestionsCount > 0
                          ? `${performance.personalityAnalysis?.weightedScore.toFixed(1)}%` 
                          : results?.opinionScore !== undefined
                            ? `${results.opinionScore.toFixed(1)}%`
                            : 'N/A'}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        {performance.opinionQuestionsCount > 0 
                          ? `${performance.opinionQuestionsCount} perguntas`
                          : results?.opinionResponses > 0
                            ? `${results.opinionResponses} perguntas`
                            : 'Baseado no perfil esperado'}
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
                    {loadingPerformance ? (
                      <div className="flex justify-center items-center h-full">
                        <p>Carregando dados de personalidade...</p>
                      </div>
                    ) : personalityRadarData ? (
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
                                position: 'top',
                                display: true
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
                      <div className="flex justify-center items-center h-full">
                        <p>Não há dados de personalidade disponíveis</p>
                      </div>
                    )}
                    
                    {/* Botões para alternar entre os grupos */}
                    {allRadarData && allRadarData.length > 1 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Visualizar por grupo:</div>
                        <div className="flex flex-wrap gap-2">
                          {allRadarData.map((data, index) => (
                            <button
                              key={index}
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                index === activeRadarIndex 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              onClick={() => {
                                setActiveRadarIndex(index);
                                setPersonalityRadarData(data);
                              }}
                            >
                              {index === 0 ? 'Todos os Grupos' : data.datasets[0].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabela de Traços de Personalidade com Pesos */}
                {performance?.personalityAnalysis?.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 && (
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
                                    {trait.weightedScore?.toFixed(2) || '-'}
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
                
                {/* Gráfico de Compatibilidade com a Vaga */}
                {performance?.personalityAnalysis?.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 && (
                  <div className="mt-6">
                    <CandidateCompatibilityChart 
                      personalityTraits={performance.personalityAnalysis.allPersonalities}
                      processId={candidate.processId}
                      expectedProfile={
                        results?.processStatus?.expectedProfile || 
                        // Perfil esperado de exemplo para demonstração
                        (() => {
                          // Criar um perfil esperado baseado nos traços do candidato, mas com valores diferentes
                          const demoProfile: Record<string, number> = {};
                          // Usar os traços do candidato como base
                          performance.personalityAnalysis?.allPersonalities.forEach((trait, index) => {
                            // Atribuir valores esperados diferentes para demonstração
                            // Quanto menor o índice, maior o valor esperado (simulando prioridade)
                            const expectedValue = Math.min(100, Math.max(20, 
                              // Inverter alguns valores para demonstrar diferenças
                              index % 2 === 0 
                                ? trait.percentage + 20 
                                : Math.max(10, trait.percentage - 20)
                            ));
                            demoProfile[trait.trait] = expectedValue;
                          });
                          console.log('Perfil esperado de demonstração:', demoProfile);
                          return demoProfile;
                        })()
                      }
                      onCompatibilityCalculated={(score, calculatedTargetProfile, calculatedMatchPercentage) => {
                        // Não atualizar a pontuação de personalidade, apenas usar os dados de perfil alvo
                        // Remover a manipulação direta do DOM que sobrescreve a pontuação
                        
                        // Atualizar os dados de compatibilidade para a seção de recomendações
                        // Usar apenas o perfil alvo e sua porcentagem, não a pontuação
                        if (calculatedTargetProfile) {
                          updateCompatibilityData(
                            performance.personalityAnalysis?.weightedScore || 0, 
                            calculatedTargetProfile, 
                            calculatedMatchPercentage
                          );
                        }
                      }}
                    />
                  </div>
                )}

                {/* Estatísticas de Tempo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tempo Total</h3>
                    <div className="text-2xl font-bold text-gray-800">
                      {performance.totalTime !== undefined && performance.totalTime !== null 
                        ? formatTime(performance.totalTime) 
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tempo calculado com base nas respostas
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tempo Médio por Questão</h3>
                    <div className="text-2xl font-bold text-gray-800">
                      {performance.avgTimePerQuestion !== undefined && performance.avgTimePerQuestion !== null
                        ? formatTime(performance.avgTimePerQuestion)
                        : 'N/A'}
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
                    <p className="text-yellow-700">
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
                  {/* Pontuação Geral */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Pontuação Geral</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-primary-600">
                        {performance.summary.overallScore !== undefined 
                          ? `${performance.summary.overallScore.toFixed(1)}%` 
                          : results?.opinionScore !== undefined && results?.score?.percentage !== undefined
                            ? `${((Number(results.opinionScore) + Number(results.score.percentage)) / 2).toFixed(1)}%`
                            : results?.opinionScore !== undefined
                              ? `${results.opinionScore.toFixed(1)}%`
                              : results?.score?.percentage !== undefined
                                ? `${results.score.percentage.toFixed(1)}%`
                                : 'N/A'}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        Combinação ponderada de múltipla escolha e perfil
                      </div>
                    </div>
                    {results?.personalityData && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Cálculo conforme manual:</span> Média dos pesos dos traços dominantes de cada grupo
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Total de Questões</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {performance.summary.totalQuestions}
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        Total de questões respondidas
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Taxa de Acerto</h3>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {typeof performance.summary.accuracy === 'number' ? performance.summary.accuracy.toFixed(1) : '0'}%
                      </div>
                      <div className="ml-4 text-sm text-gray-500">
                        Porcentagem de acertos
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estatísticas de Desempenho por Etapa */}
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
                              className={`h-full rounded-full ${
                                stage.accuracy >= 70 ? 'bg-green-500' : 
                                stage.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stage.accuracy}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Gráfico de Radar de Personalidade */}
                {performance?.personalityAnalysis?.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 && (
                  <div className="mt-6">
                    <PersonalityRadarChart 
                      traits={performance.personalityAnalysis.allPersonalities}
                      height={300}
                      className="bg-white rounded-lg p-4 shadow-sm"
                    />
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
              <Radar 
                data={{
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
                }} 
                options={{
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
                }} 
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
                        return `${context.label}: ${context.raw}%`;
                      }
                    }
                  },
                  title: {
                    display: true,
                    text: 'Porcentagem real de cada traço',
                    font: {
                      size: 12
                    }
                  }
                },
              }} />
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
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {personality.trait}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-full rounded-full ${
                                personality.percentage >= 70 ? 'bg-green-500' : 
                                personality.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${personality.percentage}%` }}
                            />
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
              {performance.personalityAnalysis.dominantPersonalities.map(p => p.trait).join(', ')} 
              <span className="text-sm font-normal text-blue-600 ml-2">
                ({performance.personalityAnalysis.dominantPersonalities.map(p => p.percentage).join(', ')}%)
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


      
    </div>
  )
}