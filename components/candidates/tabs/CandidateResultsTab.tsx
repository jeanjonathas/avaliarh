import { Candidate, PersonalityTrait } from '../types'
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
  const [loading, setLoading] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [results, setResults] = useState<CandidateResults | null>(null)
  const [performance, setPerformance] = useState<CandidatePerformance | null>(null)
  
  // Dados para os gráficos
  const [stagePerformanceData, setStagePerformanceData] = useState<any>(null);
  const [personalityRadarData, setPersonalityRadarData] = useState<any>(null);

  // Variáveis para armazenar os dados de compatibilidade calculados pelo CandidateCompatibilityChart
  const [targetProfile, setTargetProfile] = useState<string>('');
  const [profileMatchPercentage, setProfileMatchPercentage] = useState<number>(0);
  const [compatibilityScore, setCompatibilityScore] = useState<number>(0);
  const [profileMatch, setProfileMatch] = useState<boolean>(false);
  const [groupCompatibilities, setGroupCompatibilities] = useState<Record<string, number>>({});
  
  // Estado para controlar a aba de grupo de personalidade selecionada
  const [selectedPersonalityGroup, setSelectedPersonalityGroup] = useState<string>('all');
  const [personalityGroups, setPersonalityGroups] = useState<{id: string, name: string, traitsCount: number}[]>([]);
  const [personalityRadarDataByGroup, setPersonalityRadarDataByGroup] = useState<Record<string, any>>({});

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
          // Dados para o gráfico de radar com todos os traços (para manter compatibilidade)
          const personalityLabels = data.personalityAnalysis.allPersonalities.map((p: any) => p.trait);
          const personalityValues = data.personalityAnalysis.allPersonalities.map((p: any) => p.percentage);
          
          // Criar dados para o gráfico de radar com todos os traços
          const allTraitsRadarData = {
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
          
          // Definir o radar data para todos os traços
          setPersonalityRadarData(allTraitsRadarData);
          
          // Armazenar o radar data para todos os traços
          const radarDataByGroup: Record<string, any> = {
            all: allTraitsRadarData
          };
          
          // Verificar se temos dados de grupos de personalidade
          if (data.personalityAnalysis.groupDetails && Object.keys(data.personalityAnalysis.groupDetails).length > 0) {
            console.log('Dados de grupos de personalidade disponíveis:', Object.keys(data.personalityAnalysis.groupDetails));
            
            // Obter os nomes dos grupos de personalidade
            // Aqui vamos buscar os nomes reais dos grupos, se disponíveis
            const groupNames: Record<string, string> = {};
            
            // Tentar obter os nomes dos grupos a partir dos metadados das perguntas
            if (data.opinionQuestions && data.opinionQuestions.length > 0) {
              data.opinionQuestions.forEach((question: any) => {
                if (question.options && question.options.length > 0) {
                  question.options.forEach((option: any) => {
                    if (option.emotionGroupId && option.emotionGroupName) {
                      groupNames[option.emotionGroupId] = option.emotionGroupName;
                    } else if (option.categoryNameUuid && option.categoryName) {
                      // Usar o nome da categoria como nome do grupo
                      // Isso é uma aproximação, pois o nome da categoria pode ser o nome do traço
                      // e não do grupo, mas é melhor que nada
                      groupNames[option.categoryNameUuid] = `Grupo: ${option.categoryName}`;
                    }
                  });
                }
              });
            }
            
            // Criar lista de grupos disponíveis
            const groups = Object.keys(data.personalityAnalysis.groupDetails).map(groupId => {
              // Usar o nome do grupo se disponível, caso contrário usar um nome genérico
              let groupName = groupNames[groupId] || `Grupo ${groupId.substring(0, 6)}`;
              
              // Se for o grupo padrão, usar um nome mais amigável
              if (groupId === 'default') {
                groupName = 'Grupo Principal';
              }
              
              // Verificar quantos traços tem neste grupo
              const traitsInGroup = data.personalityAnalysis.groupDetails[groupId].length;
              
              return { 
                id: groupId, 
                name: groupName,
                traitsCount: traitsInGroup 
              };
            });
            
            // Filtrar grupos que realmente têm múltiplos traços (pelo menos 2)
            // Isso evita que tenhamos uma aba para cada traço individual
            const validGroups = groups.filter(group => group.traitsCount >= 1);
            
            // Se não houver grupos válidos, usar apenas "Todos os Grupos"
            if (validGroups.length === 0) {
              console.log('Nenhum grupo com múltiplos traços encontrado, usando apenas "Todos os Grupos"');
              setPersonalityGroups([{ id: 'all', name: 'Todos os Traços', traitsCount: personalityLabels.length }]);
            } else {
              // Adicionar a opção "Todos os grupos"
              validGroups.unshift({ id: 'all', name: 'Todos os Grupos', traitsCount: personalityLabels.length });
              
              // Atualizar a lista de grupos
              setPersonalityGroups(validGroups);
            }
            
            // Para cada grupo, criar dados para o gráfico de radar
            Object.entries(data.personalityAnalysis.groupDetails).forEach(([groupId, traits]) => {
              const groupTraits = traits as any[];
              const groupLabels = groupTraits.map(p => p.trait);
              const groupValues = groupTraits.map(p => p.percentage);
              
              // Criar dados para o gráfico de radar deste grupo
              radarDataByGroup[groupId] = {
                labels: groupLabels,
                datasets: [
                  {
                    label: `Perfil de Personalidade - ${groups.find(g => g.id === groupId)?.name || groupId}`,
                    data: groupValues,
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
            });
          } else {
            console.log('Dados de grupos de personalidade não disponíveis, usando apenas dados agregados');
            // Definir apenas o grupo "Todos"
            setPersonalityGroups([{ id: 'all', name: 'Todos os Traços', traitsCount: personalityLabels.length }]);
          }
          
          // Atualizar os dados de radar por grupo
          setPersonalityRadarDataByGroup(radarDataByGroup);
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

  // Função para converter dados do gráfico de radar em formato de tabela
  const getPersonalitiesFromRadarData = (radarData: any) => {
    const personalities = radarData.datasets[0].data.map((value: number, index: number) => ({
      trait: radarData.labels[index],
      percentage: value,
    }));
    return personalities;
  };

  // Agrupar traços por grupo de personalidade (groupId)
  useEffect(() => {
    if (performance?.personalityAnalysis?.allPersonalities) {
      const traits = performance.personalityAnalysis.allPersonalities;
      
      // Obter o mapa de IDs de grupo
      const personalityAnalysis = performance.personalityAnalysis as any;
      const personalityGroupIds = personalityAnalysis.personalityGroupIds || {};
      
      // Agrupar traços por grupo de personalidade
      const traitsByGroup: Record<string, Array<any>> = {};
      
      // Primeiro, agrupar todos os traços pelo ID do grupo
      traits.forEach(trait => {
        // Usar o mapa personalityGroupIds para obter o ID do grupo
        const groupId = personalityGroupIds[trait.trait] || trait.categoryNameUuid || 'default';
        
        if (!traitsByGroup[groupId]) {
          traitsByGroup[groupId] = [];
        }
        traitsByGroup[groupId].push(trait);
      });
      
      console.log('Grupos de personalidade encontrados:', Object.keys(traitsByGroup).length);
      
      // Criar array de grupos para as abas
      const groups = [
        { id: 'all', name: 'Todos os Grupos', traitsCount: traits.length }
      ];
      
      // Adicionar grupos reais
      Object.entries(traitsByGroup).forEach(([groupId, groupTraits]) => {
        // Usar apenas os primeiros 6 caracteres do UUID para tornar a exibição mais limpa
        const shortId = groupId.substring(0, 6);
        groups.push({
          id: groupId,
          name: `Grupo ${shortId}`,
          traitsCount: groupTraits.length
        });
      });
      
      setPersonalityGroups(groups);
      
      // Atualizar compatibilidades por grupo
      if (personalityAnalysis.groupScores) {
        setGroupCompatibilities(personalityAnalysis.groupScores);
      }
    }
  }, [performance]);

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
      setProfileMatch(performance?.personalityAnalysis?.dominantPersonality?.trait === calculatedTargetProfile);
      
      // Atualizar o texto da recomendação com os novos valores
      updateRecommendationText(score, calculatedTargetProfile, calculatedMatchPercentage);
    }
  };

  // Função para atualizar o texto da recomendação
  const updateRecommendationText = (score: number, targetProfile: string, profileMatchPercentage: number) => {
    const recommendationElement = document.getElementById('recommendation-text');
    if (!recommendationElement) return;
    
    let text = `Este candidato demonstrou excelente desempenho técnico com ${performance?.summary?.accuracy?.toFixed(1)}% de acertos. `;
    
    if (performance?.personalityAnalysis?.dominantPersonality) {
      text += `Seu perfil dominante é &ldquo;${performance.personalityAnalysis.dominantPersonality.trait}&rdquo; (${performance.personalityAnalysis.dominantPersonality.percentage.toFixed(1)}%), `;
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
                        {performance.personalityAnalysis?.weightedScore !== undefined && performance.opinionQuestionsCount > 0
                          ? `${performance.personalityAnalysis?.weightedScore.toFixed(1)}%` 
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
                    
                    {/* Abas para selecionar o grupo de personalidade */}
                    {personalityGroups.length > 1 && (
                      <div className="flex flex-wrap mb-4 border-b border-gray-200">
                        {personalityGroups.map((group) => (
                          <button
                            key={group.id}
                            className={`px-4 py-2 text-sm font-medium ${
                              selectedPersonalityGroup === group.id
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedPersonalityGroup(group.id)}
                          >
                            {group.name} ({group.traitsCount} traços)
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {personalityRadarData ? (
                      <div className="h-64">
                        <Radar 
                          data={personalityRadarDataByGroup[selectedPersonalityGroup] || personalityRadarData} 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              r: {
                                min: 0,
                                max: 100,
                                ticks: {
                                  stepSize: 20,
                                  showLabelBackdrop: false,
                                  color: '#6B7280',
                                  font: {
                                    size: 10
                                  }
                                },
                                pointLabels: {
                                  color: '#4B5563',
                                  font: {
                                    size: 11
                                  }
                                },
                                grid: {
                                  color: 'rgba(107, 114, 128, 0.2)'
                                },
                                angleLines: {
                                  color: 'rgba(107, 114, 128, 0.2)'
                                }
                              }
                            },
                            plugins: {
                              legend: {
                                position: 'top' as const,
                                labels: {
                                  boxWidth: 12,
                                  font: {
                                    size: 11
                                  }
                                }
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context: any) {
                                    return `${context.dataset.label}: ${context.raw}%`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>Não há dados de personalidade disponíveis</p>
                        <p className="text-sm mt-2">O candidato não respondeu perguntas opinativas ou os dados não foram processados corretamente</p>
                      </div>
                    )}
                    
                    {/* Informações adicionais sobre o grupo selecionado */}
                    {selectedPersonalityGroup !== 'all' && personalityGroups.length > 1 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
                        <p className="font-medium">Informações sobre {personalityGroups.find(g => g.id === selectedPersonalityGroup)?.name}</p>
                        <p className="mt-1">
                          Este gráfico mostra apenas os traços de personalidade deste grupo específico.
                          A pontuação de compatibilidade é calculada separadamente para cada grupo.
                        </p>
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
                {performance.personalityAnalysis && performance.personalityAnalysis.allPersonalities && performance.personalityAnalysis.allPersonalities.length > 0 && (
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
                      onCompatibilityCalculated={(score, calculatedTargetProfile, calculatedMatchPercentage, groupComps) => {
                        // Atualizar a pontuação de compatibilidade no card de Perfil de Personalidade
                        const personalityCard = document.querySelector('.bg-gray-50.rounded-lg.p-4.border.border-gray-200 .text-3xl.font-bold.text-green-600');
                        if (personalityCard && performance.opinionQuestionsCount > 0) {
                          personalityCard.textContent = `${score.toFixed(1)}%`;
                        }
                        
                        // Atualizar os dados de compatibilidade para a seção de recomendações
                        updateCompatibilityData(score, calculatedTargetProfile, calculatedMatchPercentage);
                        setGroupCompatibilities(groupComps);
                      }}
                      personalityGroupIds={(performance?.personalityAnalysis as any)?.personalityGroupIds}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-500">Total de Questões</p>
                        <p className="text-xl font-semibold">{performance.summary.totalQuestions}</p>
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
                        <p className="text-sm text-gray-500">Respostas Corretas</p>
                        <p className="text-xl font-semibold text-green-600">{performance.summary.correctAnswers}</p>
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
                        <p className="text-sm text-gray-500">Taxa de Acerto</p>
                        <p className="text-xl font-semibold">{typeof performance.summary.accuracy === 'number' ? performance.summary.accuracy.toFixed(1) : '0'}%</p>
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
                          <h4 className="font-medium">{stage.stageName}</h4>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              
              {/* Abas para selecionar o grupo de personalidade (igual ao primeiro gráfico) */}
              {personalityGroups.length > 1 && (
                <div className="flex flex-wrap mb-4 border-b border-gray-200">
                  {personalityGroups
                    .filter((group, index) => 
                      group.id === 'all' || 
                      (index <= 2 && group.traitsCount > 1)
                    )
                    .map((group) => (
                      <button
                        key={group.id}
                        className={`px-3 py-1 text-xs font-medium ${
                          selectedPersonalityGroup === group.id
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPersonalityGroup(group.id)}
                      >
                        {group.name} ({group.traitsCount} traços)
                      </button>
                    ))}
                </div>
              )}
              
              <Pie data={{
                // Usar os dados do grupo selecionado ou todos os traços se "all" estiver selecionado
                labels: selectedPersonalityGroup !== 'all' && personalityRadarDataByGroup[selectedPersonalityGroup]
                  ? personalityRadarDataByGroup[selectedPersonalityGroup].labels
                  : personalityRadarDataByGroup.all.labels,
                datasets: [
                  {
                    data: selectedPersonalityGroup !== 'all' && personalityRadarDataByGroup[selectedPersonalityGroup]
                      ? personalityRadarDataByGroup[selectedPersonalityGroup].datasets[0].data
                      : personalityRadarDataByGroup.all.datasets[0].data,
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
                      'rgba(255, 99, 132, 0.5)',  // Cores adicionais para suportar mais de 10 traços
                      'rgba(54, 162, 235, 0.5)',
                      'rgba(255, 206, 86, 0.5)',
                      'rgba(75, 192, 192, 0.5)',
                      'rgba(153, 102, 255, 0.5)',
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
                      'rgba(255, 99, 132, 1)',  // Cores adicionais para suportar mais de 10 traços
                      'rgba(54, 162, 235, 1)',
                      'rgba(255, 206, 86, 1)',
                      'rgba(75, 192, 192, 1)',
                      'rgba(153, 102, 255, 1)',
                    ],
                    borderWidth: 1,
                  },
                ],
              }} options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right' as const,
                    labels: {
                      boxWidth: 12,
                      font: {
                        size: 10
                      }
                    }
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
              {personalityRadarDataByGroup && (
                <Radar 
                  data={personalityRadarDataByGroup[selectedPersonalityGroup] || personalityRadarDataByGroup.all} 
                  options={{
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
                  }}
                />
              )}
            </div>
          </div>

          {/* Tabela de Personalidades */}
          <div className="mt-8">
            <h4 className="text-md font-medium text-gray-700 mb-4">Detalhamento de Traços de Personalidade</h4>
            
            {/* Abas para selecionar o grupo de personalidade (igual aos gráficos) */}
            {personalityGroups.length > 1 && (
              <div className="flex flex-wrap mb-4 border-b border-gray-200">
                {personalityGroups
                  .filter((group, index) => 
                    group.id === 'all' || 
                    (index <= 2 && group.traitsCount > 1)
                  )
                  .map((group) => (
                    <button
                      key={group.id}
                      className={`px-4 py-2 text-sm font-medium ${
                        selectedPersonalityGroup === group.id
                          ? 'text-primary-600 border-b-2 border-primary-600'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPersonalityGroup(group.id)}
                    >
                      {group.name} ({group.traitsCount} traços)
                    </button>
                  ))}
              </div>
            )}
            
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
                  {(selectedPersonalityGroup !== 'all' && personalityRadarDataByGroup[selectedPersonalityGroup]
                    ? getPersonalitiesFromRadarData(personalityRadarDataByGroup[selectedPersonalityGroup])
                    : performance.personalityAnalysis.allPersonalities
                  ).map((personality, index) => (
                    <tr key={index} className={index === 0 ? "bg-blue-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {personality.trait} {index === 0 && <span className="text-xs text-blue-600 ml-2">(Dominante)</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recomendações</h3>
        <div className="space-y-4">
          {(() => {
            // Usar os dados de performance em vez dos resultados antigos
            const overallScore = performance?.summary?.overallScore || 0;
            const multipleChoiceScore = performance?.summary?.multipleChoiceScore || 0;
            const opinionScore = performance?.summary?.opinionScore || 0;
            const accuracy = performance?.summary?.accuracy || 0;
            const dominantPersonality = performance?.personalityAnalysis?.dominantPersonality?.trait;
            const totalTime = performance?.totalTime || 0;
            const avgTimePerQuestion = performance?.avgTimePerQuestion || 0;
            
            // Identificar o perfil procurado (perfil com maior peso)
            const allPersonalities = performance?.personalityAnalysis?.allPersonalities || [];
            const hasTraitWeights = performance?.personalityAnalysis?.hasTraitWeights || false;
            
            // Encontrar o perfil com maior peso (se houver pesos configurados)
            let targetProfile = '';
            let targetProfileWeight = 0;
            let profileMatch = false;
            let profileMatchPercentage = 0;
            
            if (hasTraitWeights && allPersonalities.length > 0) {
              const sortedByWeight = [...allPersonalities].sort((a, b) => (b.weight || 1) - (a.weight || 1));
              if (sortedByWeight.length > 0) {
                targetProfile = sortedByWeight[0].trait;
                targetProfileWeight = sortedByWeight[0].weight || 1;
                
                // Verificar se o perfil dominante do candidato corresponde ao perfil procurado
                profileMatch = dominantPersonality === targetProfile;
                
                // Calcular a porcentagem de correspondência com o perfil procurado
                const targetProfileData = allPersonalities.find(p => p.trait === targetProfile);
                profileMatchPercentage = targetProfileData ? targetProfileData.percentage : 0;
              }
            }
            
            let recommendationClass = '';
            let recommendationTitle = '';
            let recommendationText = '';
            
            if (accuracy >= 80) {
              recommendationClass = 'bg-green-50 border-l-4 border-green-500';
              recommendationTitle = 'Candidato Recomendado';
              recommendationText = `Este candidato demonstrou excelente desempenho técnico com ${accuracy.toFixed(1)}% de acertos. `;
              
              if (dominantPersonality) {
                recommendationText += `Seu perfil dominante é &ldquo;${dominantPersonality}&rdquo; (${performance?.personalityAnalysis?.dominantPersonality?.percentage.toFixed(1)}%), `;
                recommendationText += 'o que complementa suas habilidades técnicas. ';
                
                // Adicionar informações sobre o perfil procurado
                if (hasTraitWeights && targetProfile) {
                  recommendationText += `\n\nO perfil procurado para esta vaga é &ldquo;${targetProfile}&rdquo; `;
                  
                  if (profileMatch) {
                    recommendationText += `e o candidato demonstra forte alinhamento com este perfil (${profileMatchPercentage.toFixed(1)}%). `;
                    recommendationText += `Esta correspondência de perfil, combinada com o excelente desempenho técnico, torna este candidato altamente recomendado para a posição. `;
                  } else {
                    // Verificar se o perfil procurado está entre os perfis do candidato
                    const targetProfileInCandidate = allPersonalities.find(p => p.trait === targetProfile);
                    if (targetProfileInCandidate && targetProfileInCandidate.percentage > 30) {
                      recommendationText += `e, embora o perfil dominante do candidato seja diferente, ele demonstra características significativas deste perfil (${targetProfileInCandidate.percentage.toFixed(1)}%). `;
                      recommendationText += `Considerando seu excelente desempenho técnico, recomendamos prosseguir com o processo de contratação. `;
                    } else {
                      recommendationText += `enquanto o perfil dominante do candidato é diferente. Isto pode indicar uma abordagem alternativa, mas potencialmente valiosa para a função. `;
                      recommendationText += `Recomendamos avaliar durante a entrevista se esta diferença de perfil pode trazer diversidade positiva para a equipe. `;
                    }
                  }
                } else {
                  recommendationText += 'Recomendamos prosseguir com o processo de contratação. ';
                }
              } else {
                recommendationText += 'Recomendamos prosseguir com o processo de contratação. ';
              }
            } else if (accuracy >= 60) {
              recommendationClass = 'bg-yellow-50 border-l-4 border-yellow-500';
              recommendationTitle = 'Candidato para Consideração';
              recommendationText = `Este candidato demonstrou desempenho satisfatório com ${accuracy.toFixed(1)}% de acertos. `;
              
              if (totalTime < 15) {
                recommendationText += 'Completou o teste rapidamente, o que pode indicar eficiência ou familiaridade com os temas abordados. ';
              } else if (totalTime > 45) {
                recommendationText += 'Dedicou tempo considerável ao teste, o que pode indicar cuidado na análise ou dificuldade com os temas abordados. ';
              }
              
              if (dominantPersonality) {
                recommendationText += `\n\nSeu perfil dominante é &ldquo;${dominantPersonality}&rdquo; (${performance?.personalityAnalysis?.dominantPersonality?.percentage.toFixed(1)}%). `;
                
                // Adicionar informações sobre o perfil procurado
                if (hasTraitWeights && targetProfile) {
                  recommendationText += `O perfil procurado para esta vaga é &ldquo;${targetProfile}&rdquo;. `;
                  
                  if (profileMatch) {
                    recommendationText += `O alinhamento do candidato com o perfil desejado (${profileMatchPercentage.toFixed(1)}%) é um ponto positivo que pode compensar parcialmente seu desempenho técnico moderado. `;
                    recommendationText += 'Recomendamos avaliar cuidadosamente outros aspectos como experiência prévia e desempenho na entrevista. ';
                  } else {
                    recommendationText += `Há uma divergência entre o perfil do candidato e o perfil ideal para a vaga, o que, combinado com seu desempenho técnico moderado, sugere cautela. `;
                    recommendationText += 'Recomendamos avaliar se as habilidades específicas do candidato podem ser desenvolvidas com treinamento. ';
                  }
                } else {
                  recommendationText += 'Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão. ';
                }
              } else {
                recommendationText += 'Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão. ';
              }
            } else {
              recommendationClass = 'bg-red-50 border-l-4 border-red-500';
              recommendationTitle = 'Candidato Não Recomendado';
              recommendationText = `Este candidato não atingiu a pontuação mínima necessária (${accuracy.toFixed(1)}% de acertos). `;
              
              if (dominantPersonality && hasTraitWeights && targetProfile) {
                if (profileMatch) {
                  recommendationText += `\n\nApesar do baixo desempenho técnico, o candidato demonstra forte alinhamento com o perfil comportamental desejado (&ldquo;${targetProfile}&rdquo;). `;
                  recommendationText += 'Isto pode indicar potencial para desenvolvimento com o treinamento adequado. ';
                }
              }
              
              if (performance?.stagePerformance?.some(stage => stage.accuracy >= 70)) {
                recommendationText += 'No entanto, demonstrou bom desempenho em algumas áreas específicas. ';
                
                const bestStage = performance?.stagePerformance?.reduce(
                  (best, current) => current.accuracy > best.accuracy ? current : best, 
                  { accuracy: 0, stageName: '' }
                );
                
                if (bestStage && bestStage.stageName) {
                  recommendationText += `\n\nDestaque para &ldquo;${bestStage.stageName}&rdquo; com ${bestStage.accuracy.toFixed(1)}% de acertos. `;
                }
                
                recommendationText += 'Pode ser considerado para outras posições que exijam essas habilidades específicas.';
              } else {
                recommendationText += 'Recomendamos considerar outros candidatos para esta posição.';
              }
            }
            
            return (
              <div className={`p-4 ${recommendationClass}`}>
                <h4 className="font-medium text-gray-800">{recommendationTitle}</h4>
                <p id="recommendation-text" className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                  {recommendationText}
                </p>
              </div>
            );
          })()}
          
          {/* Análise de Compatibilidade com o Perfil Desejado */}
          {performance?.personalityAnalysis?.hasTraitWeights && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">Compatibilidade com o Perfil Desejado</h4>
              
              {/* Abas para selecionar o grupo de personalidade (igual aos gráficos) */}
              {personalityGroups.length > 1 && (
                <div className="flex flex-wrap mb-4 border-b border-gray-200">
                  {/* Filtrar para mostrar apenas "Todos os Grupos" e no máximo 2 grupos mais relevantes */}
                  {personalityGroups
                    .filter((group, index) => 
                      group.id === 'all' || 
                      (index <= 2 && Object.keys(groupCompatibilities).includes(group.id))
                    )
                    .map((group) => (
                      <button
                        key={group.id}
                        className={`px-4 py-2 text-sm font-medium ${
                          selectedPersonalityGroup === group.id
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPersonalityGroup(group.id)}
                      >
                        {group.name} {group.id !== 'all' && `(${group.traitsCount} traços)`}
                      </button>
                    ))}
                </div>
              )}
              
              {/* Compatibilidade geral (média de todos os grupos) */}
              {targetProfile && selectedPersonalityGroup === 'all' && (
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {targetProfile} 
                      <span className="text-xs font-medium text-green-600 ml-1">(Perfil Desejado)</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      {profileMatchPercentage.toFixed(1)}% 
                      <span className="text-xs text-gray-500 ml-1">
                        (Peso: {performance?.personalityAnalysis?.allPersonalities.find(p => p.trait === targetProfile)?.weight?.toFixed(1) || '?'})
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-full rounded-full ${
                        profileMatchPercentage >= 70 ? 'bg-green-500' : 
                        profileMatchPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${profileMatchPercentage}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Compatibilidade por grupo */}
              {targetProfile && selectedPersonalityGroup !== 'all' && Object.keys(groupCompatibilities).length > 0 && (
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {targetProfile} - {personalityGroups.find(g => g.id === selectedPersonalityGroup)?.name}
                      <span className="text-xs font-medium text-green-600 ml-1">(Perfil Desejado)</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      {(groupCompatibilities[selectedPersonalityGroup] || 0).toFixed(1)}% 
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-full rounded-full ${
                        (groupCompatibilities[selectedPersonalityGroup] || 0) >= 70 ? 'bg-green-500' : 
                        (groupCompatibilities[selectedPersonalityGroup] || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${groupCompatibilities[selectedPersonalityGroup] || 0}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Compatibilidade de todos os grupos (quando um grupo específico está selecionado) */}
              {targetProfile && selectedPersonalityGroup !== 'all' && Object.keys(groupCompatibilities).length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
                  <p className="font-medium">Compatibilidade média de todos os grupos: {profileMatchPercentage.toFixed(1)}%</p>
                  <p className="mt-1">
                    Esta é a média das compatibilidades de todos os grupos de personalidade.
                    A compatibilidade acima é específica para o grupo selecionado.
                  </p>
                </div>
              )}
              
              {/* Lista de compatibilidades por grupo (quando "Todos os Grupos" está selecionado) */}
              {targetProfile && selectedPersonalityGroup === 'all' && Object.keys(groupCompatibilities).length > 0 && personalityGroups.length > 1 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Compatibilidade por Grupo de Personalidade</h5>
                  <div className="space-y-2">
                    {Object.entries(groupCompatibilities).map(([groupId, compatibility]) => {
                      const groupName = personalityGroups.find(g => g.id === groupId)?.name || `Grupo ${groupId}`;
                      return (
                        <div key={groupId} className="flex flex-col">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-700">
                              {groupName}
                            </span>
                            <span className="text-xs text-gray-600">
                              {compatibility.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-full rounded-full ${
                                compatibility >= 70 ? 'bg-green-500' : 
                                compatibility >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${compatibility}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Áreas para desenvolvimento */}
          <div className="mt-4">
            <h4 className="font-medium text-gray-800">Áreas para Desenvolvimento:</h4>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
              {performance?.stagePerformance?.filter(stage => stage.accuracy < 60).map(stage => (
                <li key={stage.stageId}>
                  {stage.stageName} ({stage.accuracy.toFixed(1)}%) - Necessita aprimoramento
                </li>
              ))}
              {performance?.stagePerformance?.filter(stage => stage.accuracy < 60).length === 0 && (
                <li>Não foram identificadas áreas críticas para desenvolvimento.</li>
              )}
            </ul>
          </div>
          
          {/* Pontos fortes */}
          <div className="mt-4">
            <h4 className="font-medium text-gray-800">Pontos Fortes:</h4>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
              {performance?.stagePerformance?.filter(stage => stage.accuracy >= 80).map(stage => (
                <li key={stage.stageId}>
                  {stage.stageName} ({stage.accuracy.toFixed(1)}%) - Excelente desempenho
                </li>
              ))}
              {performance?.stagePerformance?.filter(stage => stage.accuracy >= 80).length === 0 && (
                <li>Não foram identificados pontos de excelência.</li>
              )}
            </ul>
          </div>
          
          {/* Tempo de resposta */}
          <div className="mt-4">
            <h4 className="font-medium text-gray-800">Análise de Tempo:</h4>
            <p className="mt-2 text-gray-600">
              {performance?.totalTime < 15 && 'O candidato completou o teste rapidamente, o que pode indicar eficiência ou familiaridade com os temas abordados.'}
              {performance?.totalTime >= 15 && performance?.totalTime <= 45 && 'O candidato completou o teste em um tempo médio, demonstrando equilíbrio entre reflexão e agilidade.'}
              {performance?.totalTime > 45 && 'O candidato dedicou um tempo considerável ao teste, o que pode indicar cuidado na análise ou dificuldade com os temas abordados.'}
            </p>
          </div>
          
          {/* Personalidade */}
          {performance?.personalityAnalysis?.dominantPersonality && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-800">Perfil Comportamental:</h4>
              <p className="mt-2 text-gray-600">
                O perfil predominante do candidato é &ldquo;{performance.personalityAnalysis.dominantPersonality.trait}&rdquo; 
                ({performance.personalityAnalysis.dominantPersonality.percentage.toFixed(1)}%). 
                O que complementa suas habilidades técnicas.
              </p>
              
              {performance.personalityAnalysis.allPersonalities.length > 1 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-700">Perfis Secundários:</h5>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-gray-600 text-sm">
                    {performance.personalityAnalysis.allPersonalities.slice(1, 3).map((personality, index) => (
                      <li key={index}>
                        {personality.trait} ({personality.percentage.toFixed(1)}%) - 
                        O que complementa suas habilidades técnicas
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}