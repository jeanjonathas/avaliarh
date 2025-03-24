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

  // Função para calcular a compatibilidade conforme a fórmula especificada
  const calculateCompatibility = useCallback((
    traits: PersonalityTrait[], 
    processTraits: Array<{name: string, weight: number, categoryNameUuid?: string}>,
    expectedProfile: Record<string, number>
  ): {traitsWithCompatibility: TraitWithCompatibility[], totalCompatibility: number} => {
    console.log('Calculando compatibilidade - Traços:', traits, 'Perfil esperado:', expectedProfile);
    
    if (!traits || traits.length === 0) {
      console.log('Sem traços para calcular compatibilidade');
      return {traitsWithCompatibility: [], totalCompatibility: 0};
    }
    
    // Verificar se há pesos de traços configurados
    if (!processTraits || processTraits.length === 0) {
      console.log('Sem pesos de traços configurados para o processo');
      return {traitsWithCompatibility: [], totalCompatibility: 0};
    }
    
    // Criar um mapa para facilitar a correspondência entre traços do candidato e do processo
    const candidateTraitMap = new Map<string, PersonalityTrait>();
    const candidateTraitUuidMap = new Map<string, PersonalityTrait>();
    
    traits.forEach(trait => {
      // Mapear por nome normalizado
      candidateTraitMap.set(trait.trait.toLowerCase().trim(), trait);
      
      // Mapear por UUID se disponível
      if (trait.categoryNameUuid) {
        candidateTraitUuidMap.set(trait.categoryNameUuid, trait);
      }
    });
    
    console.log('Mapa de traços do candidato por nome:', Object.fromEntries(candidateTraitMap.entries()));
    console.log('Mapa de traços do candidato por UUID:', Object.fromEntries(candidateTraitUuidMap.entries()));
    
    // Mapear os traços do processo para os traços do candidato
    const matchedTraits: PersonalityTrait[] = [];
    
    processTraits.forEach(processTrait => {
      // Tentar encontrar o traço do candidato correspondente
      let candidateTrait: PersonalityTrait | undefined;
      
      // Primeiro tentar por UUID
      if (processTrait.categoryNameUuid && candidateTraitUuidMap.has(processTrait.categoryNameUuid)) {
        candidateTrait = candidateTraitUuidMap.get(processTrait.categoryNameUuid);
        console.log(`Traço encontrado por UUID (${processTrait.categoryNameUuid}): ${candidateTrait?.trait}`);
      } 
      // Depois tentar por nome normalizado
      else {
        const normalizedName = processTrait.name.toLowerCase().trim();
        if (candidateTraitMap.has(normalizedName)) {
          candidateTrait = candidateTraitMap.get(normalizedName);
          console.log(`Traço encontrado por nome (${normalizedName}): ${candidateTrait?.trait}`);
        }
      }
      
      // Se encontrou o traço, adicionar à lista com o peso do processo
      if (candidateTrait) {
        matchedTraits.push({
          ...candidateTrait,
          weight: processTrait.weight
        });
      } else {
        console.log(`Nenhum traço do candidato encontrado para ${processTrait.name}`);
        // Adicionar um traço vazio para manter a correspondência com o processo
        matchedTraits.push({
          trait: processTrait.name,
          count: 0,
          percentage: 0,
          weight: processTrait.weight,
          weightedScore: 0,
          categoryNameUuid: processTrait.categoryNameUuid
        });
      }
    });
    
    console.log('Traços correspondidos:', matchedTraits);
    
    // Ordenar os traços por peso (do maior para o menor)
    const sortedTraits = [...matchedTraits].sort((a, b) => (b.weight || 0) - (a.weight || 0));
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
  }, [traitsWithCompatibility]);

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
            traits: defaultTraits,
            expectedProfile: propExpectedProfile || null,
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
      
      // Verificar se há traços configurados
      if (data.traits && data.traits.length > 0) {
        console.log(`Encontrados ${data.traits.length} traços configurados para o processo`);
        
        // Verificar se os traços têm os campos necessários
        const validTraits = data.traits.filter(trait => 
          trait && typeof trait.name === 'string' && typeof trait.weight === 'number'
        );
        
        if (validTraits.length === 0) {
          console.error('Nenhum traço válido encontrado nos dados do processo');
          throw new Error('Configuração de traços inválida');
        }
        
        // Adicionar UUID dos traços do candidato aos traços do processo
        const traitsWithUuid = validTraits.map(trait => {
          // Tentar encontrar o UUID correspondente nos traços do candidato
          const matchingTrait = personalityTraits.find(pt => 
            pt.trait.toLowerCase().trim() === trait.name.toLowerCase().trim()
          );
          
          return {
            ...trait,
            categoryNameUuid: matchingTrait?.categoryNameUuid
          };
        });
        
        console.log('Traços processados com UUID:', traitsWithUuid);
        
        setProcessPersonalityData({
          traits: traitsWithUuid,
          expectedProfile: data.expectedProfile || propExpectedProfile || null
        });
        setUsingDefaultData(false);
      } else {
        console.log('Nenhum traço configurado para o processo, verificando traços do candidato');
        // Verificar se temos traços do candidato para usar como fallback
        if (personalityTraits && personalityTraits.length > 0) {
          const defaultTraits = personalityTraits.map(trait => ({
            name: trait.trait,
            weight: 1,
            categoryNameUuid: trait.categoryNameUuid
          }));
          
          console.log('Usando traços do candidato como fallback:', defaultTraits);
          setProcessPersonalityData({
            traits: defaultTraits,
            expectedProfile: propExpectedProfile || null,
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
          traits: defaultTraits,
          expectedProfile: propExpectedProfile || null,
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
  }, [processId, personalityTraits, propExpectedProfile, fetchProcessPersonalityData]);

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
      setError('Dados de personalidade do processo não disponíveis');
      return;
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
      const { traitsWithCompatibility, totalCompatibility } = calculateCompatibility(
        personalityTraits,
        processPersonalityData.traits,
        expectedProfile
      );
      
      // Verificar se foi possível calcular a compatibilidade
      if (traitsWithCompatibility.length === 0) {
        setError('Não foi possível calcular a compatibilidade');
        return;
      }
      
      // Atualizar o estado com os resultados
      setTraitsWithCompatibility(traitsWithCompatibility);
      setCompatibilityScore(totalCompatibility);
      
      // Encontrar o perfil alvo (traço com maior peso)
      let targetProfile = '';
      let targetProfileMatchPercentage = 0;
      
      if (traitsWithCompatibility.length > 0) {
        // Ordenar por peso para encontrar o traço com maior peso
        const sortedByWeight = [...traitsWithCompatibility].sort((a, b) => (b.weight || 1) - (a.weight || 1));
        if (sortedByWeight.length > 0) {
          targetProfile = sortedByWeight[0].trait;
          // Encontrar a porcentagem de compatibilidade para o perfil alvo
          const targetProfileData = traitsWithCompatibility.find(t => t.trait === targetProfile);
          targetProfileMatchPercentage = targetProfileData ? targetProfileData.percentage : 0;
        }
      }
      
      // Notificar o componente pai sobre o cálculo de compatibilidade
      if (onCompatibilityCalculated) {
        onCompatibilityCalculated(
          totalCompatibility,
          targetProfile,
          targetProfileMatchPercentage
        );
      }
      
      setError(null);
    } catch (error) {
      console.error('Erro ao calcular compatibilidade:', error);
      setError('Erro ao calcular compatibilidade');
    }
  }, [processPersonalityData, personalityTraits, calculateCompatibility, loading, onCompatibilityCalculated]);

  // Buscar os traços de personalidade completos do processo seletivo
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
  }, [processId, personalityTraits, propExpectedProfile, fetchProcessPersonalityData]);

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

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col items-center justify-center p-4 text-gray-500">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 w-full">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Configuração Incompleta</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      {error === 'Nenhum traço de personalidade configurado para este processo' ? (
                        <>
                          Não foi possível calcular a compatibilidade. Verifique se os traços de personalidade foram configurados corretamente no processo seletivo.
                          <br /><br />
                          Acesse a configuração do processo e defina os pesos para cada traço de personalidade.
                        </>
                      ) : error === 'Candidato não possui traços de personalidade' ? (
                        <>
                          Não foi possível calcular a compatibilidade. O candidato não possui traços de personalidade.
                          <br /><br />
                          Verifique se o candidato respondeu perguntas opinativas no teste.
                        </>
                      ) : (
                        <>
                          Ocorreu um erro ao calcular a compatibilidade. Verifique se o candidato está associado a um processo seletivo válido.
                          <br /><br />
                          Verifique se o processo seletivo tem os pesos de personalidade configurados corretamente.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!traitsWithCompatibility || traitsWithCompatibility.length === 0) {
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
                    <span className="ml-2 text-xs text-gray-500">(Peso hierárquico: {trait.hierarchicalWeight})</span>
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
