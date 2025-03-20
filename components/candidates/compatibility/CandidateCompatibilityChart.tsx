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
}

interface TraitWithCompatibility extends PersonalityTrait {
  compatibility: number;
  realCompatibility: number;
  weight: number;
  expectedValue: number;
  position: number;
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
  candidateId
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
    console.log('Traços de personalidade recebidos:', personalityTraits);
    fetchProcessPersonalityData();
  }, [processId, personalityTraits]);

  useEffect(() => {
    if (!mergedTraits || mergedTraits.length === 0) {
      console.log('Sem traços mesclados para calcular compatibilidade');
      return;
    }

    console.log('Calculando compatibilidade com traços mesclados:', mergedTraits);

    // Usar o perfil esperado da API ou o fornecido como prop
    const effectiveExpectedProfile = 
      processPersonalityData?.expectedProfile || 
      propExpectedProfile || 
      {};
    
    console.log('Perfil esperado efetivo:', effectiveExpectedProfile);
    
    // Verificar se o perfil esperado tem pelo menos um traço
    const hasExpectedProfile = Object.keys(effectiveExpectedProfile).length > 0;
    
    // Se não houver perfil esperado, criar um com valores padrão (50%)
    if (!hasExpectedProfile) {
      console.log('Criando perfil esperado padrão');
      const defaultProfile = {};
      mergedTraits.forEach(trait => {
        defaultProfile[trait.trait] = 50; // Valor padrão de 50%
      });
      
      console.log('Perfil esperado padrão criado:', defaultProfile);
      
      // Calcular a compatibilidade usando o perfil padrão
      calculateCompatibility(mergedTraits, defaultProfile);
      setUsingDefaultData(true);
    } else {
      // Calcular a compatibilidade usando o perfil esperado existente
      console.log('Usando perfil esperado existente:', effectiveExpectedProfile);
      calculateCompatibility(mergedTraits, effectiveExpectedProfile);
      setUsingDefaultData(false);
    }
  }, [mergedTraits, processPersonalityData, propExpectedProfile]);

  // Função para calcular a compatibilidade conforme a fórmula especificada
  const calculateCompatibility = (
    traits: PersonalityTrait[], 
    expectedProfile: Record<string, number>
  ) => {
    console.log('Calculando compatibilidade - Traços:', traits, 'Perfil esperado:', expectedProfile);
    
    if (!traits || traits.length === 0) {
      console.log('Sem traços para calcular compatibilidade');
      setCompatibilityScore(0);
      setTraitsWithCompatibility([]);
      return;
    }
    
    // Ordenar os traços por peso (do maior para o menor)
    const sortedTraits = [...traits].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    const totalTraits = sortedTraits.length;
    
    // Criar um mapa de posição na hierarquia para cada traço
    const positionMap = new Map<string, number>();
    sortedTraits.forEach((trait, index) => {
      positionMap.set(trait.trait, index + 1); // Posição começa em 1
    });
    
    // Para debug
    console.log('Mapa de posições:', Object.fromEntries(positionMap.entries()));
    console.log('Traços ordenados por peso:', sortedTraits.map(t => `${t.trait} (peso ${t.weight})`));
    
    // Calcular a compatibilidade total considerando apenas traços com valores reais
    // Exemplo: Se apenas cccccccccc tem valor 100% e os outros são 0%, a compatibilidade
    // total deve ser igual à compatibilidade hierárquica de cccccccccc
    
    // Filtrar traços com valores reais (não zero)
    const traitsWithValues = traits.filter(trait => (trait.percentage || 0) > 0);
    
    // Se não houver traços com valores, a compatibilidade é 0
    if (traitsWithValues.length === 0) {
      setCompatibilityScore(0);
      setTraitsWithCompatibility([]);
      return;
    }
    
    // Caso especial: se apenas um traço tem valor, a compatibilidade total
    // deve ser igual à compatibilidade hierárquica desse traço
    if (traitsWithValues.length === 1) {
      const onlyTrait = traitsWithValues[0];
      const position = positionMap.get(onlyTrait.trait) || totalTraits;
      const hierarchyCompatibility = ((totalTraits - position + 1) / totalTraits) * 100;
      
      console.log(`Apenas um traço com valor: ${onlyTrait.trait}, Compatibilidade: ${hierarchyCompatibility}%`);
      
      // Se o valor não é 100%, ajustar proporcionalmente
      const actualValue = onlyTrait.percentage || 0;
      const finalCompatibility = (actualValue / 100) * hierarchyCompatibility;
      
      setCompatibilityScore(Math.round(finalCompatibility));
    }
    
    let totalWeightedCompatibility = 0;
    let totalWeight = 0;
    
    const traitsCompatibility = traits.map(trait => {
      const actualValue = trait.percentage || 0;
      const weight = trait.weight || 1;
      const position = positionMap.get(trait.trait) || totalTraits;
      
      // Calcular a compatibilidade máxima possível para este traço com base na sua posição
      // Ci = ((n - posição(Pi) + 1) / n) × 100
      const maxCompatibility = ((totalTraits - position + 1) / totalTraits) * 100;
      
      // A compatibilidade hierárquica é baseada apenas na posição
      const hierarchyCompatibility = maxCompatibility;
      
      // A compatibilidade real do candidato é baseada no valor real do traço
      // Se o valor real é 100%, então a compatibilidade é máxima para este traço
      // Se o valor real é menor, a compatibilidade é proporcional
      const realCompatibility = (actualValue / 100) * hierarchyCompatibility;
      
      // Acumular para o cálculo da compatibilidade total
      totalWeightedCompatibility += weight * realCompatibility;
      totalWeight += weight;
      
      // Para debug
      console.log(`Traço: ${trait.trait}, Peso: ${weight}, Posição: ${position}, Valor: ${actualValue}%, Compatibilidade Hierárquica: ${hierarchyCompatibility.toFixed(2)}%, Compatibilidade Real: ${realCompatibility.toFixed(2)}%`);
      
      return {
        ...trait,
        compatibility: hierarchyCompatibility, // Mantemos a compatibilidade hierárquica para exibição
        realCompatibility: realCompatibility, // Adicionamos a compatibilidade real para o cálculo total
        expectedValue: maxCompatibility, // Valor esperado é a compatibilidade máxima
        weight,
        position
      };
    }) as TraitWithCompatibility[];

    console.log('Traços com compatibilidade calculada:', traitsCompatibility);
    console.log(`Total ponderado: ${totalWeightedCompatibility}, Peso total: ${totalWeight}`);
    
    // Calcular a compatibilidade total como média ponderada das compatibilidades reais
    // Compatibilidade Total = ∑(Pi × Ci_real) / ∑Pi
    if (traitsWithValues.length > 1 && totalWeight > 0) {
      const finalScore = totalWeightedCompatibility / totalWeight;
      console.log(`Compatibilidade calculada: ${finalScore.toFixed(2)}%`);
      setCompatibilityScore(Math.round(finalScore));
    }

    setTraitsWithCompatibility(traitsCompatibility);
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
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Compatibilidade com o Perfil Esperado</h3>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-800 rounded-md p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-10 h-10 border-t-2 border-b-2 border-primary-600 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Carregando dados de compatibilidade...</p>
        </div>
      ) : (
        <>
          {usingDefaultData && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-md p-4 mb-4">
              <p className="text-sm">
                <strong>Nota:</strong> Este gráfico está usando dados padrão porque o processo não tem um perfil esperado definido.
                Para obter resultados mais precisos, defina os traços de personalidade esperados no processo seletivo.
              </p>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/3 flex justify-center mb-4 md:mb-0">
              <div className="relative w-48 h-48">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gray-800">{compatibilityScore}%</span>
                  <span className="text-sm text-gray-500">Compatibilidade</span>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-2/3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-gray-700">Traços de Personalidade</h4>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Compatibilidade baseada na hierarquia dos traços
                </div>
              </div>
              
              {traitsWithCompatibility.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-md text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-gray-500 italic">Nenhum traço de personalidade encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
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
                          ({Math.round(trait.percentage)}% do esperado)
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
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CandidateCompatibilityChart;
