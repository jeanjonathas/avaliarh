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

interface TraitGroup {
  id: string;
  traits: TraitWithCompatibility[];
  totalCompatibility: number;
}

const CandidateCompatibilityChart: React.FC<CandidateCompatibilityChartProps> = ({
  personalityTraits,
  expectedProfile: propExpectedProfile,
  processId,
  candidateId,
  onCompatibilityCalculated
}) => {
  const [compatibilityScore, setCompatibilityScore] = useState<number>(0);
  const [traitGroups, setTraitGroups] = useState<TraitGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processPersonalityData, setProcessPersonalityData] = useState<ProcessPersonalityData | null>(null);
  const [mergedTraits, setMergedTraits] = useState<PersonalityTrait[]>([]);
  const [usingDefaultData, setUsingDefaultData] = useState<boolean>(false);

  // Função para calcular a compatibilidade entre os traços do candidato e os traços esperados
  const calculateCompatibility = useCallback((
    candidateTraits: PersonalityTrait[],
    processTraits: Array<{name: string, weight: number, categoryNameUuid?: string}>,
    expectedProfile: Record<string, number> = {}
  ) => {
    console.log('Calculando compatibilidade:');
    console.log('- Traços do candidato:', candidateTraits);
    console.log('- Traços do processo:', processTraits);
    console.log('- Perfil esperado:', expectedProfile);
    
    // Mapear traços por nome para facilitar o acesso
    const candidateTraitsMap: Record<string, PersonalityTrait> = {};
    candidateTraits.forEach(trait => {
      candidateTraitsMap[trait.trait.toLowerCase().trim()] = trait;
    });
    
    // Mapear traços do processo por nome
    const processTraitsMap: Record<string, {name: string, weight: number, categoryNameUuid?: string}> = {};
    processTraits.forEach(trait => {
      processTraitsMap[trait.name.toLowerCase().trim()] = trait;
    });
    
    // Obter todos os nomes de traços únicos
    const allTraitNames = Array.from(new Set([
      ...Object.keys(candidateTraitsMap),
      ...Object.keys(processTraitsMap)
    ]));
    
    if (allTraitNames.length === 0) {
      console.error('Nenhum traço em comum entre candidato e processo');
      return { traitGroups: [], totalCompatibility: 0 };
    }
    
    // Calcular a compatibilidade para cada traço
    const traitsWithCompatibility: TraitWithCompatibility[] = allTraitNames
      .filter(traitName => 
        candidateTraitsMap[traitName] && 
        (processTraitsMap[traitName] || expectedProfile[traitName])
      )
      .map(traitName => {
        const candidateTrait = candidateTraitsMap[traitName];
        const processTrait = processTraitsMap[traitName];
        const expectedValue = expectedProfile[traitName] || (processTrait ? processTrait.weight : 0);
        
        // Para perguntas opinativas, se o candidato escolheu a opção com peso máximo (5),
        // a compatibilidade deve ser 100%
        let compatibility = 0;
        
        // Verificar se estamos lidando com pesos (escala 1-5) ou porcentagens (0-100)
        const isWeightScale = expectedValue <= 5;
        const maxWeight = 5; // Peso máximo possível
        
        if (isWeightScale) {
          // Se o candidato escolheu a alternativa com peso máximo, a compatibilidade é 100%
          // Consideramos que o peso máximo é 5 e que o valor do candidato está em porcentagem (0-100)
          // Então, se o valor do candidato é 50%, isso corresponde a um peso de 2.5 na escala 1-5
          const normalizedCandidateValue = (candidateTrait.percentage / 100) * maxWeight;
          
          // Se o valor normalizado do candidato é igual ou maior que o valor esperado,
          // a compatibilidade é 100%
          if (Math.abs(normalizedCandidateValue - expectedValue) < 0.1) {
            compatibility = 100;
          } else if (normalizedCandidateValue >= expectedValue) {
            compatibility = 100;
          } else {
            // Caso contrário, calculamos a compatibilidade com base na diferença
            const normalizedDifference = Math.abs(normalizedCandidateValue - expectedValue);
            compatibility = Math.max(0, 100 - (normalizedDifference * 100 / maxWeight));
          }
        } else {
          // Se estamos na escala de porcentagem (0-100), calcular normalmente
          const difference = Math.abs(candidateTrait.percentage - expectedValue);
          compatibility = Math.max(0, 100 - difference);
        }
        
        // Para testes apenas com perguntas opinativas, verificar se o candidato escolheu a alternativa com peso máximo
        // Se sim, a compatibilidade deve ser 100%
        if (candidateTrait.isOpinionQuestion && candidateTrait.percentage >= 80) {
          compatibility = 100;
        }
        
        console.log(`Traço: ${candidateTrait.trait}, Valor: ${candidateTrait.percentage}%, Esperado: ${expectedValue}, Compatibilidade: ${compatibility}%`);
        
        return {
          ...candidateTrait,
          compatibility,
          realCompatibility: compatibility,
          weight: processTrait ? processTrait.weight : 1,
          expectedValue,
          position: 0,
          categoryNameUuid: processTrait?.categoryNameUuid || candidateTrait.categoryNameUuid
        };
      });
    
    // Agrupar traços por categoryNameUuid (que representa a etapa do teste)
    const groupedTraits: Record<string, TraitWithCompatibility[]> = {};
    traitsWithCompatibility.forEach(trait => {
      const groupId = trait.categoryNameUuid || 'default';
      if (!groupedTraits[groupId]) {
        groupedTraits[groupId] = [];
      }
      groupedTraits[groupId].push(trait);
    });
    
    // Calcular compatibilidade para cada grupo (etapa do teste)
    const traitGroups: TraitGroup[] = Object.entries(groupedTraits).map(([groupId, traits]) => {
      // Ordenar traços por porcentagem dentro do grupo
      traits.sort((a, b) => b.percentage - a.percentage);
      
      // Atribuir posições dentro do grupo
      traits = traits.map((trait, index) => ({
        ...trait,
        position: index + 1
      }));
      
      // Calcular pesos hierárquicos dentro do grupo
      const totalPositions = traits.length;
      traits = traits.map(trait => {
        const hierarchicalWeight = (totalPositions - trait.position + 1) / totalPositions;
        return {
          ...trait,
          hierarchicalWeight
        };
      });
      
      // Verificar se todos os traços do grupo têm compatibilidade 100%
      const allTraitsMaxCompatibility = traits.every(trait => trait.compatibility === 100);
      
      // Se todos os traços têm compatibilidade 100%, o grupo também tem compatibilidade 100%
      let groupCompatibility = 0;
      if (allTraitsMaxCompatibility) {
        groupCompatibility = 100;
      } else {
        // Caso contrário, calcular a média ponderada das compatibilidades
        groupCompatibility = traits.reduce((sum, trait) => {
          return sum + (trait.compatibility * (trait.hierarchicalWeight || 1));
        }, 0) / traits.reduce((sum, trait) => sum + (trait.hierarchicalWeight || 1), 0);
      }
      
      console.log(`Grupo: ${groupId}, Compatibilidade: ${groupCompatibility}%`);
      
      return {
        id: groupId,
        traits,
        totalCompatibility: Number(groupCompatibility.toFixed(1))
      };
    });
    
    // Verificar se todos os grupos têm compatibilidade 100%
    const allGroupsMaxCompatibility = traitGroups.every(group => group.totalCompatibility === 100);
    
    // Se todos os grupos têm compatibilidade 100%, a compatibilidade total também é 100%
    let totalCompatibility = 0;
    if (allGroupsMaxCompatibility) {
      totalCompatibility = 100;
    } else {
      // Caso contrário, calcular a média das compatibilidades dos grupos
      totalCompatibility = traitGroups.reduce((sum, group) => sum + group.totalCompatibility, 0) / traitGroups.length;
    }
    
    console.log(`Compatibilidade total: ${totalCompatibility}%`);
    
    return {
      traitGroups,
      totalCompatibility: Number(totalCompatibility.toFixed(1))
    };
  }, []);

  // Função para buscar os dados de personalidade do processo
  const fetchProcessPersonalityData = useCallback(async () => {
    if (!processId) {
      console.log('Sem ID de processo, usando dados padrão');
      return;
    }
    
    try {
      setLoading(true);
      
      // Buscar dados de personalidade do processo
      const response = await fetch(`/api/admin/processes/${processId}/personality-traits`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de personalidade: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dados de personalidade do processo:', data);
      
      if (!data || !data.traits || data.traits.length === 0) {
        console.log('Nenhum traço de personalidade configurado para este processo');
        
        // Se não houver traços configurados, mas temos traços do candidato,
        // criar dados padrão baseados nos traços do candidato
        if (personalityTraits && personalityTraits.length > 0) {
          console.log('Criando dados padrão baseados nos traços do candidato');
          
          const defaultTraits = personalityTraits.map((trait, index) => ({
            name: trait.trait,
            weight: trait.weight || 5, // Usar peso máximo como padrão para perguntas opinativas
            categoryNameUuid: trait.categoryNameUuid
          }));
          
          setProcessPersonalityData({
            traits: defaultTraits,
            expectedProfile: propExpectedProfile || null,
            isDefaultData: true
          });
          
          setUsingDefaultData(true);
        } else {
          setError('Nenhum traço de personalidade configurado para este processo');
        }
        return;
      }
      
      // Atualizar o estado com os dados do processo
      setProcessPersonalityData({
        traits: data.traits,
        expectedProfile: data.expectedProfile || propExpectedProfile || null
      });
      
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar dados de personalidade:', error);
      setError('Erro ao buscar dados de personalidade do processo');
      
      // Em caso de erro, tentar criar dados padrão
      if (personalityTraits && personalityTraits.length > 0) {
        console.log('Criando dados padrão após erro');
        
        const defaultTraits = personalityTraits.map((trait, index) => ({
          name: trait.trait,
          weight: trait.weight || 5, // Usar peso máximo como padrão para perguntas opinativas
          categoryNameUuid: trait.categoryNameUuid
        }));
        
        setProcessPersonalityData({
          traits: defaultTraits,
          expectedProfile: propExpectedProfile || null,
          isDefaultData: true
        });
        
        setUsingDefaultData(true);
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

  // Efeito para calcular a compatibilidade quando os dados do processo são carregados
  useEffect(() => {
    if (loading) return;
    
    console.log('Calculando compatibilidade com dados de processo:', processPersonalityData);
    
    // Verificar se há traços de personalidade do candidato
    if (!personalityTraits || personalityTraits.length === 0) {
      setError('Candidato não possui traços de personalidade');
      return;
    }
    
    // Verificar se há dados de personalidade do processo
    if (!processPersonalityData) {
      // Se não temos dados do processo, tentar criar dados padrão
      if (personalityTraits.length > 0) {
        console.log('Criando dados padrão baseados nos traços do candidato');
        
        // Criar dados de processo padrão
        const defaultTraits = personalityTraits.map((trait, index) => ({
          name: trait.trait,
          weight: trait.weight || 5, // Usar peso máximo como padrão para perguntas opinativas
          categoryNameUuid: trait.categoryNameUuid
        }));
        
        setProcessPersonalityData({
          traits: defaultTraits,
          expectedProfile: propExpectedProfile || null,
          isDefaultData: true
        });
        
        setUsingDefaultData(true);
        return; // O próximo ciclo do useEffect vai pegar esses dados
      } else {
        setError('Dados de personalidade do processo não disponíveis');
        return;
      }
    }
    
    // Verificar se há traços configurados no processo
    if (!processPersonalityData.traits || processPersonalityData.traits.length === 0) {
      setError('Nenhum traço de personalidade configurado para este processo');
      return;
    }
    
    // Verificar se há um perfil esperado configurado
    const expectedProfile = processPersonalityData.expectedProfile || {};
    if (Object.keys(expectedProfile).length === 0) {
      console.log('Perfil esperado não configurado, usando valores padrão');
    }
    
    try {
      // Calcular a compatibilidade
      const { traitGroups, totalCompatibility } = calculateCompatibility(
        personalityTraits,
        processPersonalityData.traits,
        expectedProfile
      );
      
      // Verificar se foi possível calcular a compatibilidade
      if (traitGroups.length === 0) {
        setError('Não foi possível calcular a compatibilidade');
        return;
      }
      
      // Atualizar o estado com os resultados
      setTraitGroups(traitGroups);
      
      // Calcular compatibilidade total
      const finalCompatibility = Math.round(totalCompatibility);
      setCompatibilityScore(finalCompatibility);
      
      // Encontrar o perfil alvo (traço com maior peso)
      let targetProfile = '';
      let targetProfileMatchPercentage = 0;
      
      if (traitGroups.length > 0) {
        // Ordenar por peso para encontrar o traço com maior peso
        const sortedByWeight = [...traitGroups].sort((a, b) => (b.totalCompatibility || 1) - (a.totalCompatibility || 1));
        if (sortedByWeight.length > 0) {
          targetProfile = sortedByWeight[0].id;
          // Encontrar a porcentagem de compatibilidade para o perfil alvo
          const targetProfileData = traitGroups.find(t => t.id === targetProfile);
          targetProfileMatchPercentage = targetProfileData ? targetProfileData.totalCompatibility : 0;
        }
      }
      
      // Notificar o componente pai sobre o cálculo de compatibilidade
      if (onCompatibilityCalculated) {
        // Enviar a pontuação de compatibilidade final
        onCompatibilityCalculated(
          finalCompatibility,
          targetProfile,
          targetProfileMatchPercentage
        );
      }
      
      setError(null);
    } catch (error) {
      console.error('Erro ao calcular compatibilidade:', error);
      setError('Erro ao calcular compatibilidade');
    }
  }, [processPersonalityData, personalityTraits, calculateCompatibility, loading, onCompatibilityCalculated, propExpectedProfile]);

  // Efeito para atualizar o componente quando o estado muda
  useEffect(() => {
    // Mostrar mensagens de depuração no console
    console.log('Estado atual do componente:', {
      loading,
      error,
      traitGroups: traitGroups?.length || 0,
      compatibilityScore
    });
  }, [loading, error, traitGroups, compatibilityScore]);

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

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex justify-center">
          <CircularProgress />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500">{error}</div>
      );
    }

    if (!traitGroups || traitGroups.length === 0) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col items-center justify-center p-4 text-gray-500">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 w-full">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Sem Dados Suficientes</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Não há dados suficientes para calcular a compatibilidade do candidato com o perfil desejado.
                      <br /><br />
                      Verifique se o candidato completou o teste e se o processo seletivo tem os traços de personalidade configurados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex flex-col items-center">
              <div className="w-full max-w-xs h-64 max-h-64 relative">
                <Doughnut
                  data={{
                    labels: ['Compatibilidade', 'Diferença'],
                    datasets: [
                      {
                        data: [compatibilityScore, Math.max(0, 100 - compatibilityScore)],
                        backgroundColor: ['#4F46E5', '#E5E7EB'],
                        borderWidth: 0,
                        cutout: '80%'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        enabled: false
                      }
                    }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {compatibilityScore}%
                    </div>
                    <div className="text-sm text-gray-500">Compatibilidade</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Traços de Personalidade</h3>
            
            {traitGroups.map((group, groupIndex) => (
              <div key={group.id} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">
                    Grupo {groupIndex + 1}
                  </h4>
                  <span className="text-sm text-gray-500">
                    Compatibilidade: {group.totalCompatibility}%
                  </span>
                </div>
                
                {group.traits.map((trait) => (
                  <div key={trait.trait} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {trait.trait} {trait.weight > 1 && `(Peso hierárquico: ${trait.weight})`}
                      </span>
                      <span className="text-sm text-gray-500">
                        Valor: {trait.percentage}%
                      </span>
                    </div>
                    
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600"
                        style={{ width: `${trait.percentage}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>Compatibilidade: {trait.realCompatibility.toFixed(1)}%</span>
                      <span>Esperado: {trait.expectedValue}%</span>
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
