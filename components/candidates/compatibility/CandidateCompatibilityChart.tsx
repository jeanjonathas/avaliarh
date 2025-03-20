import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PersonalityTrait } from '../types';
import { toast } from 'react-hot-toast';
import { CircularProgress, Skeleton } from '@mui/material';

// Registrar componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface CandidateCompatibilityChartProps {
  personalityTraits: PersonalityTrait[];
  expectedProfile?: Record<string, number>;
  processId?: string;
  candidateId?: string;
  onCompatibilityCalculated?: (compatibilityScore: number) => void;
}

interface TraitWithCompatibility extends PersonalityTrait {
  compatibility: number;
  realCompatibility: number;
  weight: number;
  expectedValue: number;
  position: number;
  hierarchicalWeight?: number;
  questionCount?: number;
  normalizationFactor?: number;
}

interface ProcessPersonalityData {
  traits: Array<{
    name: string;
    weight: number;
    categoryNameUuid?: string;
  }>;
  expectedProfile: Record<string, number> | null;
  isDefaultData?: boolean;
}

const CandidateCompatibilityChart: React.FC<CandidateCompatibilityChartProps> = ({
  personalityTraits,
  expectedProfile: propExpectedProfile,
  processId,
  candidateId,
  onCompatibilityCalculated
}) => {
  const [compatibilityScore, setCompatibilityScore] = useState<number>(0);
  const [traitsWithCompatibility, setTraitsWithCompatibility] = useState<TraitWithCompatibility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processPersonalityData, setProcessPersonalityData] = useState<ProcessPersonalityData | null>(null);
  const [mergedTraits, setMergedTraits] = useState<PersonalityTrait[]>([]);
  const [usingDefaultData, setUsingDefaultData] = useState<boolean>(false);

  // Buscar os traços de personalidade completos do processo seletivo
  const fetchProcessPersonalityData = async () => {
    if (!processId) {
      // Se não tiver processId, usar apenas os traços fornecidos via props
      console.log('Sem processId, usando apenas os traços fornecidos via props');
      setMergedTraits(personalityTraits);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Removida a autenticação para testes
      const response = await fetch(`/api/admin/processes/${processId}/personality-traits`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha ao buscar traços de personalidade do processo');
      }
      
      const data = await response.json();
      console.log('Dados de personalidade do processo:', data);
      setProcessPersonalityData(data);
      
      // Verificar se os dados são padrão
      if (data.isDefaultData) {
        console.log('Usando dados padrão do endpoint');
        setUsingDefaultData(true);
      } else {
        setUsingDefaultData(false);
      }
      
      // Mesclar os traços do processo com os do candidato
      if (data && Array.isArray(data.traits)) {
        const merged = mergePersonalityTraits(personalityTraits, data.traits);
        console.log('Traços mesclados:', merged);
        setMergedTraits(merged);
      } else {
        // Se não houver traços do processo, usar apenas os do candidato
        console.log('Sem traços do processo, usando apenas os do candidato');
        setMergedTraits(personalityTraits);
      }
    } catch (error) {
      console.error('Erro ao buscar traços de personalidade do processo:', error);
      setError((error as Error).message || 'Erro ao buscar dados de personalidade do processo');
      toast.error('Erro ao buscar dados de personalidade do processo');
      // Em caso de erro, ainda usar os traços do candidato
      setMergedTraits(personalityTraits);
    } finally {
      setLoading(false);
    }
  };

  // Mesclar os traços do candidato com os traços completos do processo
  const mergePersonalityTraits = (
    candidateTraits: PersonalityTrait[], 
    processTraits: Array<{name: string, weight: number, categoryNameUuid?: string}>
  ): PersonalityTrait[] => {
    // Se não houver traços do candidato, retornar vazio
    if (!candidateTraits || candidateTraits.length === 0) {
      console.log('Sem traços do candidato para mesclar');
      return [];
    }

    console.log('Mesclando traços - Candidato:', candidateTraits, 'Processo:', processTraits);
    
    // Criar mapas dos traços do candidato para fácil acesso - um por nome e outro por UUID
    const candidateTraitsByName = new Map<string, PersonalityTrait>();
    const candidateTraitsByUuid = new Map<string, PersonalityTrait>();
    
    candidateTraits.forEach(trait => {
      if (trait && trait.trait) {
        // Normalizar o nome do traço para comparação
        candidateTraitsByName.set(trait.trait.toLowerCase().trim(), trait);
        
        // Se tiver UUID, adicionar ao mapa por UUID também
        if (trait.categoryNameUuid) {
          candidateTraitsByUuid.set(trait.categoryNameUuid, trait);
        }
      }
    });
    
    console.log('Mapa de traços do candidato por nome:', Array.from(candidateTraitsByName.entries()));
    console.log('Mapa de traços do candidato por UUID:', Array.from(candidateTraitsByUuid.entries()));
    
    // Se houver traços do processo, mesclar com os do candidato
    if (processTraits && processTraits.length > 0) {
      // Criar um conjunto para rastrear quais traços do candidato foram usados
      const usedCandidateTraits = new Set<string>();
      const usedCandidateTraitUuids = new Set<string>();
      
      // Primeiro, mapear os traços do processo
      const mergedTraits = processTraits.map(processTrait => {
        // Normalizar o nome do traço para comparação
        const processTraitName = processTrait.name.toLowerCase().trim();
        const processTraitUuid = processTrait.categoryNameUuid;
        
        console.log(`Buscando traço do candidato para "${processTrait.name}" (UUID: "${processTraitUuid}")`);
        
        // Tentar encontrar o traço primeiro pelo UUID, depois pelo nome
        let candidateTrait = null;
        
        if (processTraitUuid && candidateTraitsByUuid.has(processTraitUuid)) {
          candidateTrait = candidateTraitsByUuid.get(processTraitUuid);
          usedCandidateTraitUuids.add(processTraitUuid);
          console.log(`Traço encontrado pelo UUID "${processTraitUuid}":`, candidateTrait);
        } else if (candidateTraitsByName.has(processTraitName)) {
          candidateTrait = candidateTraitsByName.get(processTraitName);
          usedCandidateTraits.add(processTraitName);
          console.log(`Traço encontrado pelo nome "${processTraitName}":`, candidateTrait);
        }
        
        if (candidateTrait) {
          // Se o candidato tem este traço, usar seus valores mas manter o peso do traço do processo
          return {
            ...candidateTrait,
            trait: processTrait.name, // Garantir que o nome do traço é o mesmo do processo
            weight: processTrait.weight,
            weightedScore: ((candidateTrait.percentage / 100) * processTrait.weight),
            categoryNameUuid: processTraitUuid || candidateTrait.categoryNameUuid
          };
        } else {
          console.log(`Traço NÃO encontrado para "${processTrait.name}"`);
          // Se o candidato não tem este traço, usar o traço do processo com valores zerados
          return {
            trait: processTrait.name,
            count: 0,
            percentage: 0,
            weight: processTrait.weight,
            weightedScore: 0,
            categoryNameUuid: processTraitUuid
          };
        }
      });
      
      // Agora, adicionar os traços do candidato que não foram usados
      candidateTraits.forEach(trait => {
        const normalizedTraitName = trait.trait.toLowerCase().trim();
        const traitUuid = trait.categoryNameUuid;
        
        // Verificar se o traço já foi usado (por nome ou UUID)
        const wasUsedByName = usedCandidateTraits.has(normalizedTraitName);
        const wasUsedByUuid = traitUuid && usedCandidateTraitUuids.has(traitUuid);
        
        if (!wasUsedByName && !wasUsedByUuid) {
          console.log(`Adicionando traço do candidato não mapeado: "${trait.trait}" (UUID: "${traitUuid}")`);
          mergedTraits.push({
            ...trait,
            weight: trait.weight || 1,
            weightedScore: trait.weightedScore || (trait.percentage / 100)
          });
        }
      });
      
      return mergedTraits;
    } else {
      // Se não houver traços do processo, usar apenas os do candidato
      return candidateTraits.map(trait => ({
        ...trait,
        weight: trait.weight || 1,
        weightedScore: trait.weightedScore || (trait.percentage / 100)
      }));
    }
  };

  useEffect(() => {
    if (processId) {
      fetchProcessPersonalityData();
    } else if (personalityTraits.length > 0) {
      // Se não temos ID do processo, usar apenas os traços fornecidos
      setMergedTraits(personalityTraits);
      
      // Criar dados de processo padrão
      const defaultTraits = personalityTraits.map((trait, index) => ({
        name: trait.trait,
        weight: trait.weight || (personalityTraits.length - index), // Peso baseado na ordem
        categoryNameUuid: trait.categoryNameUuid
      }));
      
      setProcessPersonalityData({
        traits: defaultTraits,
        expectedProfile: propExpectedProfile || null,
        isDefaultData: true
      });
      
      setUsingDefaultData(true);
    }
  }, [processId, personalityTraits, propExpectedProfile]);

  useEffect(() => {
    if (mergedTraits.length > 0 && processPersonalityData) {
      try {
        const result = calculateCompatibility(
          mergedTraits, 
          processPersonalityData.traits, 
          processPersonalityData.expectedProfile || propExpectedProfile || {}
        );
        
        if (result) {
          setTraitsWithCompatibility(result.traitsWithCompatibility);
          setCompatibilityScore(result.totalCompatibility);
          
          // Notificar o componente pai sobre o cálculo de compatibilidade
          if (onCompatibilityCalculated) {
            onCompatibilityCalculated(result.totalCompatibility);
          }
        }
      } catch (error) {
        console.error("Erro ao calcular compatibilidade:", error);
        setError("Erro ao calcular compatibilidade");
      } finally {
        setLoading(false);
      }
    }
  }, [mergedTraits, processPersonalityData, propExpectedProfile, onCompatibilityCalculated]);

  // Função para calcular a compatibilidade conforme a fórmula especificada
  const calculateCompatibility = (
    traits: PersonalityTrait[], 
    processTraits: Array<{name: string, weight: number, categoryNameUuid?: string}>,
    expectedProfile: Record<string, number>
  ): {traitsWithCompatibility: TraitWithCompatibility[], totalCompatibility: number} => {
    console.log('Calculando compatibilidade - Traços:', traits, 'Perfil esperado:', expectedProfile);
    
    if (!traits || traits.length === 0) {
      console.log('Sem traços para calcular compatibilidade');
      return {traitsWithCompatibility: [], totalCompatibility: 0};
    }
    
    // Ordenar os traços por peso (do maior para o menor)
    const sortedTraits = [...traits].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    const totalTraits = sortedTraits.length;
    
    // Atribuir pesos hierárquicos baseados no número de traços (n, n-1, n-2, ..., 1)
    // Isso garante uma distribuição consistente independente do número de traços
    const hierarchicalWeights = new Map<string, number>();
    sortedTraits.forEach((trait, index) => {
      hierarchicalWeights.set(trait.trait, totalTraits - index); // Peso n para o primeiro, n-1 para o segundo, etc.
    });
    
    // Criar um mapa de posição na hierarquia para cada traço
    const positionMap = new Map<string, number>();
    sortedTraits.forEach((trait, index) => {
      positionMap.set(trait.trait, index + 1); // Posição começa em 1
    });
    
    // Calcular o número médio de questões por traço para normalização
    const questionsPerTrait = new Map<string, number>();
    let totalQuestions = 0;
    
    // Assumimos que cada traço tem pelo menos uma questão
    // Na prática, isso deveria ser obtido dos dados reais
    traits.forEach(trait => {
      // Aqui poderíamos obter o número real de questões para cada traço
      // Por enquanto, assumimos um valor padrão de 4 questões por traço
      const questionCount = 4; // Valor padrão, idealmente seria dinâmico
      questionsPerTrait.set(trait.trait, questionCount);
      totalQuestions += questionCount;
    });
    
    const averageQuestionsPerTrait = totalQuestions / totalTraits;
    
    console.log('Pesos hierárquicos:', Object.fromEntries(hierarchicalWeights.entries()));
    console.log('Mapa de posições:', Object.fromEntries(positionMap.entries()));
    console.log('Questões por traço:', Object.fromEntries(questionsPerTrait.entries()));
    console.log('Média de questões por traço:', averageQuestionsPerTrait);
    
    // Filtrar traços com valores reais (não zero) apenas para o cálculo especial
    const traitsWithValues = traits.filter(trait => (trait.percentage || 0) > 0);
    
    // Caso especial: se apenas um traço tem valor, a compatibilidade total
    // deve ser igual à compatibilidade hierárquica desse traço
    if (traitsWithValues.length === 1 && traits.length > 1) {
      const onlyTrait = traitsWithValues[0];
      const position = positionMap.get(onlyTrait.trait) || totalTraits;
      const hierarchyCompatibility = ((totalTraits - position + 1) / totalTraits) * 100;
      
      console.log(`Apenas um traço com valor: ${onlyTrait.trait}, Compatibilidade: ${hierarchyCompatibility}%`);
      
      // Se o valor não é 100%, ajustar proporcionalmente
      const actualValue = onlyTrait.percentage || 0;
      const finalCompatibility = (actualValue / 100) * hierarchyCompatibility;
      
      // Calcular a compatibilidade para TODOS os traços, mesmo os sem valor
      const allTraitsWithCompatibility = traits.map(trait => {
        const traitPosition = positionMap.get(trait.trait) || totalTraits;
        const traitHierarchyCompatibility = ((totalTraits - traitPosition + 1) / totalTraits) * 100;
        const traitActualValue = trait.percentage || 0;
        const traitRealCompatibility = (traitActualValue / 100) * traitHierarchyCompatibility;
        const questionCount = questionsPerTrait.get(trait.trait) || 4;
        const normalizationFactor = Math.sqrt(questionCount / averageQuestionsPerTrait);
        const hierarchicalWeight = hierarchicalWeights.get(trait.trait) || 1;
        
        return {
          ...trait,
          compatibility: traitHierarchyCompatibility, // Mantemos a compatibilidade hierárquica para exibição
          realCompatibility: traitRealCompatibility, // Usamos a compatibilidade normalizada
          expectedValue: traitHierarchyCompatibility,
          weight: trait.weight || 1,
          hierarchicalWeight,
          position: traitPosition,
          questionCount,
          normalizationFactor
        } as TraitWithCompatibility;
      });
      
      // Retornar todos os traços com a compatibilidade total calculada
      return {
        traitsWithCompatibility: allTraitsWithCompatibility,
        totalCompatibility: Math.round(finalCompatibility)
      };
    }
    
    let totalWeightedCompatibility = 0;
    let totalHierarchicalWeight = 0;
    
    const traitsCompatibility = traits.map(trait => {
      const actualValue = trait.percentage || 0;
      const originalWeight = trait.weight || 1;
      const hierarchicalWeight = hierarchicalWeights.get(trait.trait) || 1;
      const position = positionMap.get(trait.trait) || totalTraits;
      const questionCount = questionsPerTrait.get(trait.trait) || 4;
      
      // Calcular a compatibilidade máxima possível para este traço com base na sua posição
      // Ci = ((n - posição(Pi) + 1) / n) × 100
      const maxCompatibility = ((totalTraits - position + 1) / totalTraits) * 100;
      
      // A compatibilidade hierárquica é baseada apenas na posição
      const hierarchyCompatibility = maxCompatibility;
      
      // Normalizar o valor do traço considerando o número de questões
      // Isso ajuda a compensar traços com diferentes números de questões
      const normalizationFactor = Math.sqrt(questionCount / averageQuestionsPerTrait);
      
      // A compatibilidade real do candidato é baseada no valor real do traço
      // Se o valor real é 100%, então a compatibilidade é máxima para este traço
      // Se o valor real é menor, a compatibilidade é proporcional
      const realCompatibility = (actualValue / 100) * hierarchyCompatibility;
      
      // Aplicar o fator de normalização para compensar diferenças no número de questões
      const normalizedCompatibility = realCompatibility * normalizationFactor;
      
      // Usar o peso hierárquico para o cálculo da compatibilidade total
      // Isso garante uma distribuição consistente dos pesos independente do número de traços
      totalWeightedCompatibility += hierarchicalWeight * normalizedCompatibility;
      totalHierarchicalWeight += hierarchicalWeight;
      
      console.log(`Traço: ${trait.trait}, Peso Original: ${originalWeight}, Peso Hierárquico: ${hierarchicalWeight}, Posição: ${position}, Valor: ${actualValue}%, Questões: ${questionCount}, Fator Normalização: ${normalizationFactor.toFixed(2)}, Compatibilidade Hierárquica: ${hierarchyCompatibility.toFixed(2)}%, Compatibilidade Real: ${realCompatibility.toFixed(2)}%, Compatibilidade Normalizada: ${normalizedCompatibility.toFixed(2)}%`);
      
      return {
        ...trait,
        compatibility: hierarchyCompatibility, // Mantemos a compatibilidade hierárquica para exibição
        realCompatibility: normalizedCompatibility, // Usamos a compatibilidade normalizada
        expectedValue: maxCompatibility, // Valor esperado é a compatibilidade máxima
        weight: originalWeight, // Mantemos o peso original para exibição
        hierarchicalWeight, // Adicionamos o peso hierárquico para referência
        position,
        questionCount, // Adicionamos o número de questões para referência
        normalizationFactor // Adicionamos o fator de normalização para referência
      };
    }) as TraitWithCompatibility[];
    
    console.log('Traços com compatibilidade calculada:', traitsCompatibility);
    console.log(`Total ponderado: ${totalWeightedCompatibility}, Peso hierárquico total: ${totalHierarchicalWeight}`);
    
    // Calcular a compatibilidade total como média ponderada das compatibilidades reais normalizadas
    // Compatibilidade Total = ∑(Wi × Ci_norm) / ∑Wi
    // Onde Wi é o peso hierárquico (n, n-1, ..., 1)
    if (traitsWithValues.length > 1 && totalHierarchicalWeight > 0) {
      const finalScore = totalWeightedCompatibility / totalHierarchicalWeight;
      console.log(`Compatibilidade calculada: ${finalScore.toFixed(2)}%`);
      return {traitsWithCompatibility, totalCompatibility: Math.round(finalScore)};
    }

    return {traitsWithCompatibility, totalCompatibility: 0};
  };

  // Dados para o gráfico de rosca
  const chartData = {
    labels: ['Compatibilidade', 'Diferença'],
    datasets: [
      {
        data: [compatibilityScore, 100 - compatibilityScore],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(211, 211, 211, 0.3)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(211, 211, 211, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Opções para o gráfico
  const chartOptions = {
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Compatibilidade com o Perfil Esperado</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="mt-2 text-sm text-red-600 hover:text-red-800"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchProcessPersonalityData();
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Calculando compatibilidade...</p>
        </div>
      ) : (
        <>
          {traitsWithCompatibility.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
              <p>Não foi possível calcular a compatibilidade. Verifique se os traços de personalidade foram configurados corretamente.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                <div className="w-full md:w-1/3 flex flex-col items-center mb-4 md:mb-0">
                  <div className="relative h-40 w-40">
                    <Doughnut data={chartData} options={chartOptions} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary-600">{compatibilityScore}%</div>
                        <div className="text-sm text-gray-500">Compatibilidade</div>
                      </div>
                    </div>
                  </div>
                  {usingDefaultData && (
                    <div className="mt-2 text-xs text-amber-600 text-center">
                      <p>Usando perfil padrão para demonstração</p>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-2/3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-gray-700">Traços de Personalidade</h4>
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Compatibilidade baseada na hierarquia dos traços
                    </div>
                  </div>
                  
                  {traitsWithCompatibility.map((trait, index) => (
                    <div key={`${trait.trait}-${index}`} className="bg-gray-50 p-3 rounded-md mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {trait.trait}
                          <span className="ml-2 text-xs text-gray-500">(Peso: {trait.weight})</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          Valor: {trait.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${trait.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          Compatibilidade hierárquica: {Math.round(trait.compatibility)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          Posição: {trait.position} de {traitsWithCompatibility.length} 
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className={`h-2 rounded-full ${
                            trait.compatibility >= 70 ? 'bg-green-500' : 
                            trait.compatibility >= 40 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${trait.compatibility}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          Compatibilidade real: {Math.round(trait.realCompatibility)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {trait.normalizationFactor !== 1 ? 
                            `(Normalização: ${trait.normalizationFactor?.toFixed(2)})` : 
                            ''}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            trait.realCompatibility >= 70 ? 'bg-indigo-500' : 
                            trait.realCompatibility >= 40 ? 'bg-orange-500' : 
                            'bg-pink-500'
                          }`}
                          style={{ width: `${trait.realCompatibility}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CandidateCompatibilityChart;
