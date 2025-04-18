import React, { useState, useEffect, useCallback } from 'react';
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
  onCompatibilityCalculated?: (
    compatibilityScore: number,
    targetProfile?: string,
    targetProfileMatchPercentage?: number
  ) => void;
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
  groupId?: string;
  groupName?: string;
}

interface ProcessPersonalityData {
  groups: Array<{
    id: string;
    name: string;
    traits: Array<{
      name: string;
      weight: number;
      categoryNameUuid?: string;
    }>;
    expectedProfile: Record<string, number>;
  }>;
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

  // Função para calcular a compatibilidade entre os traços do candidato e os pesos do processo
  const calculateCompatibility = useCallback((
    traits: PersonalityTrait[], 
    processTraits: Array<{name: string, weight: number, categoryNameUuid?: string}>,
    expectedProfile: Record<string, number>
  ): {traitsWithCompatibility: TraitWithCompatibility[], totalCompatibility: number} => {
    console.log('Calculando compatibilidade com os seguintes dados:');
    console.log('- Traços do candidato:', traits);
    console.log('- Traços do processo:', processTraits);
    console.log('- Perfil esperado:', expectedProfile);
    
    if (!traits || traits.length === 0) {
      console.error('Nenhum traço de personalidade fornecido para o candidato');
      return { traitsWithCompatibility: [], totalCompatibility: 0 };
    }
    
    if (!processTraits || processTraits.length === 0) {
      console.error('Nenhum traço de personalidade configurado para o processo');
      return { traitsWithCompatibility: [], totalCompatibility: 0 };
    }
    
    // Mapear os traços do candidato para o formato esperado
    const candidateTraitsMap = traits.reduce((acc: Record<string, PersonalityTrait>, trait) => {
      acc[trait.trait] = trait;
      return acc;
    }, {});
    
    // Mapear os traços do processo para o formato esperado
    const processTraitsMap = processTraits.reduce((acc: Record<string, {name: string, weight: number, categoryNameUuid?: string}>, trait) => {
      acc[trait.name] = trait;
      return acc;
    }, {});
    
    // Criar uma lista de todos os traços únicos (união dos traços do candidato e do processo)
    const allTraitNames = Array.from(new Set([
      ...Object.keys(candidateTraitsMap),
      ...Object.keys(processTraitsMap)
    ]));
    
    console.log('Lista de todos os traços únicos:', allTraitNames);
    
    // Se não houver traços em comum, retornar compatibilidade zero
    if (allTraitNames.length === 0) {
      console.error('Nenhum traço em comum entre candidato e processo');
      return { traitsWithCompatibility: [], totalCompatibility: 0 };
    }
    
    // Calcular a compatibilidade para cada traço
    let traitsWithCompatibility: TraitWithCompatibility[] = allTraitNames
      // Filtrar apenas os traços que existem tanto no candidato quanto no processo
      .filter(traitName => 
        candidateTraitsMap[traitName] && 
        (processTraitsMap[traitName] || expectedProfile[traitName])
      )
      // Mapear para o formato TraitWithCompatibility
      .map(traitName => {
        const candidateTrait = candidateTraitsMap[traitName];
        const processTrait = processTraitsMap[traitName];
        const expectedValue = expectedProfile[traitName] || (processTrait ? processTrait.weight : 0);
        
        // Calcular a diferença entre o valor do candidato e o valor esperado
        const difference = Math.abs(candidateTrait.percentage - expectedValue);
        
        // Calcular a compatibilidade (100% - diferença normalizada)
        // Quanto menor a diferença, maior a compatibilidade
        const compatibility = Math.max(0, 100 - (difference * 100 / 100));
        
        return {
          ...candidateTrait,
          compatibility,
          realCompatibility: compatibility, // Inicialmente igual à compatibilidade
          weight: processTrait ? processTrait.weight : 1,
          expectedValue,
          position: 0, // Será definido depois de ordenar
        };
      });
    
    // Se não houver traços com compatibilidade calculada, retornar compatibilidade zero
    if (traitsWithCompatibility.length === 0) {
      console.error('Não foi possível calcular a compatibilidade para nenhum traço');
      return { traitsWithCompatibility: [], totalCompatibility: 0 };
    }
    
    // Ordenar os traços por porcentagem (do maior para o menor)
    traitsWithCompatibility.sort((a, b) => b.percentage - a.percentage);
    
    // Atribuir posições com base na ordenação
    traitsWithCompatibility = traitsWithCompatibility.map((trait, index) => ({
      ...trait,
      position: index + 1
    }));
    
    // Calcular pesos hierárquicos com base na posição
    // Quanto menor a posição (mais dominante o traço), maior o peso
    const totalPositions = traitsWithCompatibility.length;
    traitsWithCompatibility = traitsWithCompatibility.map(trait => {
      const hierarchicalWeight = (totalPositions - trait.position + 1) / totalPositions;
      return {
        ...trait,
        hierarchicalWeight
      };
    });
    
    // Calcular compatibilidade real considerando os pesos hierárquicos
    traitsWithCompatibility = traitsWithCompatibility.map(trait => {
      // Normalizar o fator de compatibilidade para dar mais peso aos traços dominantes
      const normalizationFactor = trait.hierarchicalWeight || 1;
      // Aplicar o fator de normalização à compatibilidade
      const realCompatibility = trait.compatibility * normalizationFactor;
      
      return {
        ...trait,
        realCompatibility,
        normalizationFactor
      };
    });
    
    // Calcular a compatibilidade total (média ponderada das compatibilidades reais)
    const totalWeights = traitsWithCompatibility.reduce((sum, trait) => 
      sum + (trait.hierarchicalWeight || 1), 0);
    
    const totalCompatibility = traitsWithCompatibility.reduce((sum, trait) => 
      sum + (trait.realCompatibility * (trait.hierarchicalWeight || 1)), 0) / totalWeights;
    
    console.log('Compatibilidade calculada:', {
      traitsWithCompatibility,
      totalCompatibility
    });
    
    return {
      traitsWithCompatibility,
      totalCompatibility
    };
  }, []);

  // Função para buscar os dados de personalidade do processo
  const fetchProcessPersonalityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Se não tiver ID de processo, usar traços do candidato como fallback
      if (!processId) {
        console.log("Nenhum ID de processo fornecido, usando traços do candidato como fallback");
        
        if (personalityTraits && personalityTraits.length > 0) {
          const defaultTraits = personalityTraits.map(trait => ({
            name: trait.trait,
            weight: 1,
            categoryNameUuid: trait.categoryNameUuid
          }));
          
          console.log('Usando traços do candidato como fallback:', defaultTraits);
          setProcessPersonalityData({
            groups: [
              {
                id: 'default',
                name: 'Padrão',
                traits: defaultTraits,
                expectedProfile: propExpectedProfile || {}
              }
            ],
            isDefaultData: true
          });
          
          setUsingDefaultData(true);
          setLoading(false);
          return;
        } else {
          console.error('Nenhum traço disponível para o candidato');
          setError('Nenhum traço de personalidade disponível');
          setLoading(false);
          return;
        }
      }
      
      console.log(`Buscando dados de personalidade para o processo ${processId}`);
      const response = await fetch(`/api/admin/processes/${processId}/personality-data`);
      
      if (!response.ok) {
        console.error(`Erro ao carregar dados: ${response.status} ${response.statusText}`);
        throw new Error('Erro ao carregar dados de personalidade do processo');
      }
      
      const data = await response.json();
      console.log('Dados de personalidade recebidos:', data);
      
      // Verificar se os dados recebidos têm a estrutura esperada
      if (!data) {
        throw new Error('Dados de personalidade do processo inválidos');
      }
      
      // Verificar se há grupos configurados
      if (data.groups && data.groups.length > 0) {
        console.log(`Encontrados ${data.groups.length} grupos configurados para o processo`);
        
        // Verificar se os grupos têm os campos necessários
        const validGroups = data.groups.filter(group => 
          group && typeof group.id === 'string' && typeof group.name === 'string' && Array.isArray(group.traits)
        );
        
        if (validGroups.length === 0) {
          console.error('Nenhum grupo válido encontrado nos dados do processo');
          throw new Error('Configuração de grupos inválida');
        }
        
        // Adicionar UUID dos traços do candidato aos grupos do processo
        const groupsWithUuid = validGroups.map(group => {
          // Tentar encontrar o UUID correspondente nos traços do candidato
          const traitsWithUuid = group.traits.map(trait => {
            const matchingTrait = personalityTraits.find(pt => 
              pt.trait.toLowerCase().trim() === trait.name.toLowerCase().trim()
            );
            
            return {
              ...trait,
              categoryNameUuid: matchingTrait?.categoryNameUuid
            };
          });
          
          return {
            ...group,
            traits: traitsWithUuid
          };
        });
        
        console.log('Grupos processados com UUID:', groupsWithUuid);
        
        setProcessPersonalityData({
          groups: groupsWithUuid,
          isDefaultData: false
        });
        setUsingDefaultData(false);
      } else {
        console.log('Nenhum grupo configurado para o processo, verificando traços do candidato');
        // Verificar se temos traços do candidato para usar como fallback
        if (personalityTraits && personalityTraits.length > 0) {
          const defaultTraits = personalityTraits.map(trait => ({
            name: trait.trait,
            weight: 1,
            categoryNameUuid: trait.categoryNameUuid
          }));
          
          console.log('Usando traços do candidato como fallback:', defaultTraits);
          setProcessPersonalityData({
            groups: [
              {
                id: 'default',
                name: 'Padrão',
                traits: defaultTraits,
                expectedProfile: propExpectedProfile || {}
              }
            ],
            isDefaultData: true
          });
          
          setUsingDefaultData(true);
        } else {
          console.error('Nenhum traço disponível para o candidato ou processo');
          setError('Nenhum traço de personalidade configurado para este processo');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados de personalidade do processo:', error);
      
      // Verificar se temos traços do candidato para usar como fallback
      if (personalityTraits && personalityTraits.length > 0) {
        console.log('Usando traços do candidato como fallback após erro');
        const defaultTraits = personalityTraits.map(trait => ({
          name: trait.trait,
          weight: 1,
          categoryNameUuid: trait.categoryNameUuid
        }));
        
        setProcessPersonalityData({
          groups: [
            {
              id: 'default',
              name: 'Padrão',
              traits: defaultTraits,
              expectedProfile: propExpectedProfile || {}
            }
          ],
          isDefaultData: true
        });
        
        setUsingDefaultData(true);
      } else {
        setError('Erro ao carregar dados de personalidade do processo');
      }
    } finally {
      setLoading(false);
    }
  }, [processId, personalityTraits, propExpectedProfile]);

  // Efeito para buscar os dados de personalidade do processo quando o componente é montado
  useEffect(() => {
    if (personalityTraits && personalityTraits.length > 0) {
      console.log('Iniciando busca de dados de personalidade do processo...');
      fetchProcessPersonalityData();
    } else {
      console.log('Sem traços de personalidade para o candidato, não é possível calcular compatibilidade');
      setError('Candidato não possui traços de personalidade');
    }
  }, [personalityTraits, fetchProcessPersonalityData]);

  useEffect(() => {
    // Processar os dados de personalidade quando disponíveis
    if (!personalityTraits || personalityTraits.length === 0) {
      setError('Candidato não possui traços de personalidade');
      setLoading(false);
      return;
    }
    
    // Verificar se há dados de personalidade do processo
    if (!processPersonalityData) {
      setError('Dados de personalidade do processo não disponíveis');
      setLoading(false);
      return;
    }
    
    // Verificar se há grupos configurados no processo
    if (!processPersonalityData.groups || processPersonalityData.groups.length === 0) {
      setError('Nenhum grupo de personalidade configurado para este processo');
      return;
    }
    
    // Processar cada grupo e calcular a compatibilidade
    const allTraitsWithCompatibility: TraitWithCompatibility[] = [];
    let totalCompatibilityScore = 0;
    
    // Para cada grupo no processo
    processPersonalityData.groups.forEach(group => {
      const expectedProfile = group.expectedProfile || {};
      if (Object.keys(expectedProfile).length === 0) {
        console.log(`Perfil esperado não configurado para o grupo ${group.name}, usando valores padrão`);
      }
      
      // Calcular a compatibilidade para este grupo
      const { traitsWithCompatibility, totalCompatibility } = calculateCompatibility(
        personalityTraits,
        group.traits,
        expectedProfile
      );
      
      // Adicionar informação do grupo a cada traço
      const traitsWithGroup = traitsWithCompatibility.map(trait => ({
        ...trait,
        groupId: group.id,
        groupName: group.name
      }));
      
      // Adicionar ao array geral
      allTraitsWithCompatibility.push(...traitsWithGroup);
      
      // Acumular a pontuação de compatibilidade
      totalCompatibilityScore += totalCompatibility;
    });
    
    // Calcular a média da compatibilidade entre todos os grupos
    const avgCompatibilityScore = processPersonalityData.groups.length > 0
      ? totalCompatibilityScore / processPersonalityData.groups.length
      : 0;
    
    // Arredondar para o inteiro mais próximo
    const roundedScore = Math.round(avgCompatibilityScore);
    
    // Atualizar o estado
    setTraitsWithCompatibility(allTraitsWithCompatibility);
    setCompatibilityScore(roundedScore);
    
    // Chamar o callback se fornecido
    if (onCompatibilityCalculated) {
      // Encontrar o traço com maior compatibilidade para sugerir como perfil alvo
      const mostCompatibleTrait = allTraitsWithCompatibility.length > 0
        ? allTraitsWithCompatibility.reduce((prev, current) => 
            prev.realCompatibility > current.realCompatibility ? prev : current
          )
        : null;
      
      // Calcular a porcentagem de correspondência com o perfil alvo
      const targetProfileMatchPercentage = mostCompatibleTrait
        ? mostCompatibleTrait.realCompatibility
        : 0;
      
      onCompatibilityCalculated(
        roundedScore,
        mostCompatibleTrait ? mostCompatibleTrait.trait : undefined,
        targetProfileMatchPercentage
      );
    }
    
    setLoading(false);
  }, [processPersonalityData, personalityTraits, calculateCompatibility, onCompatibilityCalculated]);

  useEffect(() => {
    // Verificar se há dados de personalidade do processo
    if (!processPersonalityData) {
      // Se não temos dados do processo, tentar criar dados padrão
      if (personalityTraits && personalityTraits.length > 0) {
        console.log('Criando dados padrão baseados nos traços do candidato');
        
        // Criar dados de processo padrão
        const defaultTraits = personalityTraits.map((trait, index) => ({
          name: trait.trait,
          weight: trait.weight || (personalityTraits.length - index), // Peso baseado na ordem
          categoryNameUuid: trait.categoryNameUuid
        }));
        
        setProcessPersonalityData({
          groups: [
            {
              id: 'default',
              name: 'Padrão',
              traits: defaultTraits,
              expectedProfile: propExpectedProfile || {}
            }
          ],
          isDefaultData: true
        });
        
        setUsingDefaultData(true);
        return; // O próximo ciclo do useEffect vai pegar esses dados
      }
    }
  }, [personalityTraits, processPersonalityData, propExpectedProfile]);

  // Efeito para atualizar o componente quando o estado muda
  useEffect(() => {
    // Mostrar mensagens de depuração no console
    console.log('Estado atual do componente:', {
      loading,
      error,
      traitsWithCompatibility: traitsWithCompatibility?.length || 0,
      compatibilityScore
    });
  }, [loading, error, traitsWithCompatibility, compatibilityScore]);

  const mergePersonalityTraits = (
    candidateTraits: PersonalityTrait[],
    processTraits?: Array<{name: string, weight: number, categoryNameUuid?: string}>
  ): PersonalityTrait[] => {
    console.log('Mesclando traços de personalidade:');
    console.log('- Traços do candidato:', candidateTraits);
    console.log('- Traços do processo:', processTraits);
    
    // Garantir que temos arrays válidos
    const safeProcessTraits = processTraits || [];
    const safeCandidateTraits = [...candidateTraits]; // Criar uma cópia para não modificar o original
    
    // Mapas para rastrear traços por nome e UUID
    const candidateTraitsByName = new Map<string, PersonalityTrait>();
    const candidateTraitsByUuid = new Map<string, PersonalityTrait>();
    
    // Preencher os mapas com os traços do candidato
    safeCandidateTraits.forEach(trait => {
      const normalizedName = trait.trait.toLowerCase().trim();
      candidateTraitsByName.set(normalizedName, trait);
      
      if (trait.categoryNameUuid) {
        candidateTraitsByUuid.set(trait.categoryNameUuid, trait);
      }
    });
    
    // Conjuntos para rastrear quais traços já foram usados
    const usedCandidateTraits = new Set<string>();
    const usedCandidateTraitUuids = new Set<string>();
    
    // Array para armazenar os traços mesclados
    let mergedTraits: PersonalityTrait[] = [];
    
    // Se temos traços do processo, usá-los como base para a mesclagem
    if (safeProcessTraits.length > 0) {
      // Primeiro, adicionar todos os traços do processo, mesclando com os do candidato quando possível
      mergedTraits = safeProcessTraits.map(processTrait => {
        const processTraitName = processTrait.name.toLowerCase().trim();
        const processTraitUuid = processTrait.categoryNameUuid;
        
        let candidateTrait: PersonalityTrait | undefined;
        
        // Tentar encontrar o traço correspondente no candidato (por UUID ou nome)
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
      
      // Agora, adicionar TODOS os traços do candidato que não foram usados
      safeCandidateTraits.forEach(trait => {
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
      
      // Registrar o número total de traços após a mesclagem
      console.log(`Total de traços após mesclagem: ${mergedTraits.length} (Candidato tinha ${safeCandidateTraits.length}, Processo tinha ${safeProcessTraits.length})`);
      
      return mergedTraits;
    } else {
      // Se não houver traços do processo, usar TODOS os traços do candidato
      const allCandidateTraits = safeCandidateTraits.map(trait => ({
        ...trait,
        weight: trait.weight || 1,
        weightedScore: trait.weightedScore || (trait.percentage / 100)
      }));
      
      console.log(`Usando apenas os traços do candidato: ${allCandidateTraits.length} traços`);
      return allCandidateTraits;
    }
  };

  // Dados para o gráfico de rosca
  const chartData = {
    labels: ['Compatível', 'Não Compatível'],
    datasets: [
      {
        data: [compatibilityScore, 100 - compatibilityScore],
        backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(229, 231, 235, 0.5)'],
        borderColor: ['rgb(59, 130, 246)', 'rgb(229, 231, 235)'],
        borderWidth: 1,
        hoverOffset: 4
      }
    ]
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

  // Função para renderizar o gráfico de compatibilidade
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-40">
          <CircularProgress size={40} />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
          <p className="font-medium">Erro ao calcular compatibilidade</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      );
    }

    // Dados para o gráfico de rosca
    const chartData = {
      labels: ['Compatível', 'Não Compatível'],
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

    // Opções para o gráfico de rosca
    const chartOptions = {
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      maintainAspectRatio: true,
      responsive: true,
    };

    // Agrupar traços por grupo
    const traitsByGroup: Record<string, TraitWithCompatibility[]> = {};
    traitsWithCompatibility.forEach(trait => {
      const groupId = trait.groupId || 'default';
      const groupName = trait.groupName || 'Padrão';
      
      if (!traitsByGroup[groupId]) {
        traitsByGroup[groupId] = [];
      }
      
      traitsByGroup[groupId].push(trait);
    });

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Compatibilidade com o Perfil Esperado</h2>
        
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
            
            <div className="mt-2 text-xs text-gray-600 text-center">
              <p>{Object.keys(traitsByGroup).length} grupos de traços</p>
            </div>
          </div>
          <div className="w-full md:w-2/3">
            {Object.entries(traitsByGroup).map(([groupId, traits], groupIndex) => (
              <div key={groupId} className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-medium text-gray-700">
                    {traits[0]?.groupName || `Grupo ${groupIndex + 1}`}
                  </h4>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {traits.length} traços
                  </div>
                </div>
                
                {traits.map((trait, index) => (
                  <div key={`${trait.trait}-${index}`} className="bg-gray-50 p-3 rounded-md mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {trait.trait}
                        <span className="ml-2 text-xs text-gray-500">(Peso: {trait.weight})</span>
                        {trait.percentage === Math.max(...traits.map(t => t.percentage)) && (
                          <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            Dominante
                          </span>
                        )}
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
                        Posição: {trait.position} de {traits.length} 
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
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderChart()}
    </div>
  );
};

export default CandidateCompatibilityChart;
