import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PersonalityTrait {
  id?: string;
  traitName: string;
  weight: number;
  order: number;
  groupId?: string; // ID do grupo de traços
  groupName?: string; // Nome do grupo de traços
}

interface TraitGroup {
  id: string;
  name: string;
  traits: string[];
  selectedTraits: PersonalityTrait[]; // Traços selecionados para este grupo
}

interface PersonalityTraitWeightConfigProps {
  value: PersonalityTrait[];
  onChange: (traits: PersonalityTrait[]) => void;
  testId?: string; // ID do teste selecionado
}

const PersonalityTraitWeightConfig: React.FC<PersonalityTraitWeightConfigProps> = ({
  value = [],
  onChange,
  testId
}) => {
  const [traitGroups, setTraitGroups] = useState<TraitGroup[]>([]);
  const [isLoadingTraits, setIsLoadingTraits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef<{[key: string]: boolean}>({});
  const previousValueRef = useRef<PersonalityTrait[]>([]);
  const pendingChangesRef = useRef<TraitGroup[]>([]);
  const [lastMovedItem, setLastMovedItem] = useState<{id: string, direction: 'up' | 'down'} | null>(null);

  // Referência para o temporizador de debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Flag para controlar se devemos sincronizar com o componente pai
  const shouldSyncRef = useRef<boolean>(false);

  // Estado para rastrear se há alterações não salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Função para notificar o componente pai sobre as mudanças
  const notifyParentOfChanges = useCallback((groups: TraitGroup[]) => {
    // Armazenar as alterações no buffer
    pendingChangesRef.current = groups;
    
    // Só notificar o componente pai se a flag estiver ativa
    if (shouldSyncRef.current) {
      // Extrair apenas os dados necessários para o componente pai
      const traitsForParent = groups.flatMap(group => 
        group.selectedTraits.map(trait => ({
          id: trait.id,
          traitName: trait.traitName,
          weight: trait.weight,
          order: trait.order,
          groupId: trait.groupId,
          groupName: trait.groupName
        }))
      );
      
      // Atualizar o valor no componente pai
      onChange(traitsForParent);
      
      console.log('Notificando o componente pai sobre as mudanças:', traitsForParent);
      
      // Resetar a flag
      shouldSyncRef.current = false;
    }
  }, [onChange]);

  // Função para sincronizar as alterações com o componente pai
  const handleSyncChanges = useCallback(() => {
    // Ativar a flag de sincronização
    shouldSyncRef.current = true;
    
    // Notificar o componente pai sobre as alterações
    if (pendingChangesRef.current.length > 0) {
      notifyParentOfChanges(pendingChangesRef.current);
      setHasUnsavedChanges(false);
    }
  }, [notifyParentOfChanges]);

  // Atualizar o estado de alterações não salvas quando os grupos forem alterados
  useEffect(() => {
    if (traitGroups.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [traitGroups]);

  // Função para buscar traços de personalidade do teste selecionado
  const fetchPersonalityTraits = useCallback(async (testId: string) => {
    try {
      setIsLoadingTraits(true);
      setError(null);
      
      console.log('Buscando traços para o teste:', testId);
      
      // Primeiro, tentar buscar dados de personalidade do processo, se disponível
      if (testId) {
        try {
          // Extrair o ID do processo da URL, se estivermos na página de edição
          const url = window.location.pathname;
          const processIdMatch = url.match(/\/processes\/edit\/([^\/]+)/);
          
          if (processIdMatch && processIdMatch[1]) {
            const processId = processIdMatch[1];
            console.log('Detectado ID do processo:', processId);
            
            const personalityResponse = await fetch(`/api/admin/processes/${processId}/personality-data`);
            
            if (personalityResponse.ok) {
              const personalityData = await personalityResponse.json();
              console.log('Dados de personalidade do processo:', personalityData);
              
              if (personalityData && personalityData.groups && personalityData.groups.length > 0) {
                // Processar os grupos e traços
                const newGroups: TraitGroup[] = personalityData.groups.map((group: any) => {
                  // Extrair os nomes dos traços para o array traits
                  const traitNames = group.traits.map((trait: any) => trait.name);
                  
                  // Converter os traços para o formato esperado pelo componente
                  const selectedTraits: PersonalityTrait[] = group.traits.map((trait: any, index: number) => ({
                    id: trait.categoryNameUuid,
                    traitName: trait.name,
                    weight: trait.weight,
                    order: index,
                    groupId: group.id,
                    groupName: group.name
                  }));
                  
                  return {
                    id: group.id,
                    name: group.name,
                    traits: traitNames,
                    selectedTraits
                  };
                });
                
                console.log('Grupos processados:', newGroups);
                setTraitGroups(newGroups);
                
                // Atualizar o valor do campo com os traços selecionados
                const allSelectedTraits = newGroups.flatMap(group => group.selectedTraits);
                if (allSelectedTraits.length > 0 && !hasInitializedRef.current[testId]) {
                  console.log('Atualizando valor do campo com traços do processo:', allSelectedTraits);
                  onChange(allSelectedTraits);
                  hasInitializedRef.current[testId] = true;
                }
                
                setIsLoadingTraits(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados de personalidade do processo:', error);
          // Continuar com a busca normal de traços
        }
      }
      
      // Se não conseguimos dados do processo, buscar as questões do teste
      // Buscar as questões do teste com tipo OPINION_MULTIPLE
      const response = await fetch(`/api/admin/questions?testId=${testId}&type=OPINION_MULTIPLE`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar questões: ${response.status}`);
      }
      
      const data = await response.json();
      const questions = Array.isArray(data) ? data : [];
      
      console.log('Resposta da API:', data);
      console.log('Questões encontradas:', questions);
      
      if (!questions || questions.length === 0) {
        console.log('Nenhuma questão encontrada para o teste:', testId);
        setError('Nenhum traço de personalidade encontrado no teste selecionado.\n\nVerifique se o teste contém perguntas opinativas com categorias de personalidade definidas.');
        setTraitGroups([]);
        setIsLoadingTraits(false);
        return;
      }
      
      // Extrair grupos e traços das questões
      const groups: TraitGroup[] = [];
      const groupMap: Record<string, string[]> = {};
      
      // Primeiro, vamos buscar os grupos de opinião para obter informações sobre os grupos
      try {
        const opinionGroupsResponse = await fetch('/api/admin/opinion-groups');
        if (opinionGroupsResponse.ok) {
          const opinionGroups = await opinionGroupsResponse.json();
          console.log('Grupos de opinião encontrados:', opinionGroups);
          
          if (opinionGroups && opinionGroups.length > 0) {
            // Criar um grupo para cada grupo de opinião
            opinionGroups.forEach((group: any) => {
              const groupId = group.id;
              const groupName = group.name;
              
              if (!groupMap[groupId]) {
                groupMap[groupId] = [];
                groups.push({
                  id: groupId,
                  name: groupName,
                  traits: [],
                  selectedTraits: []
                });
              }
              
              // Adicionar as categorias do grupo como traços
              if (group.categories && group.categories.length > 0) {
                const groupIndex = groups.findIndex(g => g.id === groupId);
                if (groupIndex !== -1) {
                  group.categories.forEach((category: any) => {
                    if (category.name && !groupMap[groupId].includes(category.name)) {
                      groupMap[groupId].push(category.name);
                      groups[groupIndex].traits.push(category.name);
                    }
                  });
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar grupos de opinião:', error);
      }
      
      // Se não conseguimos obter grupos de opinião, vamos criar grupos baseados nas categorias das opções
      if (groups.length === 0) {
        console.log('Criando grupos baseados nas categorias das opções');
        
        // Mapear categorias por UUID para agrupar perguntas com as mesmas categorias
        const categoriesByUUID: Record<string, { name: string, questions: any[] }> = {};
        
        // Primeiro passo: coletar todas as categorias únicas por UUID
        questions.forEach((question: any) => {
          if (question.options && question.options.length > 0) {
            question.options.forEach((option: any) => {
              if (option.categoryName && option.categoryId) {
                const uuid = option.categoryId;
                if (!categoriesByUUID[uuid]) {
                  categoriesByUUID[uuid] = {
                    name: option.categoryName,
                    questions: []
                  };
                }
                
                // Adicionar a questão à categoria se ainda não estiver lá
                if (!categoriesByUUID[uuid].questions.some((q: any) => q.id === question.id)) {
                  categoriesByUUID[uuid].questions.push(question);
                }
              }
            });
          }
        });
        
        // Segundo passo: criar grupos baseados nas categorias únicas
        const processedGroups = new Set<string>();
        
        Object.entries(categoriesByUUID).forEach(([uuid, categoryInfo]) => {
          // Criar um ID de grupo baseado nas categorias presentes nas questões
          const questionsIds = categoryInfo.questions.map(q => q.id).sort().join('-');
          const groupId = `group-${questionsIds}`;
          
          // Evitar duplicação de grupos
          if (!processedGroups.has(groupId)) {
            processedGroups.add(groupId);
            
            // Criar um nome para o grupo baseado nas categorias
            const categoryNames = Object.values(categoriesByUUID)
              .filter(cat => cat.questions.some(q => categoryInfo.questions.includes(q)))
              .map(cat => cat.name);
            
            const groupName = `Grupo: ${categoryNames.join(', ')}`;
            
            if (!groupMap[groupId]) {
              groupMap[groupId] = [];
              groups.push({
                id: groupId,
                name: groupName,
                traits: [],
                selectedTraits: []
              });
            }
            
            // Adicionar todas as categorias únicas como traços
            const groupIndex = groups.findIndex(g => g.id === groupId);
            if (groupIndex !== -1) {
              Object.values(categoriesByUUID)
                .filter(cat => cat.questions.some(q => categoryInfo.questions.includes(q)))
                .forEach(cat => {
                  if (!groupMap[groupId].includes(cat.name)) {
                    groupMap[groupId].push(cat.name);
                    groups[groupIndex].traits.push(cat.name);
                  }
                });
            }
          }
        });
      }
      
      // Se ainda não temos grupos, criar um grupo para cada pergunta (fallback)
      if (groups.length === 0) {
        console.log('Fallback: Criando um grupo para cada pergunta');
        
        questions.forEach((question: any) => {
          const groupName = `Grupo: ${question.text}`;
          const groupId = `group-${question.id}`;
          
          if (!groupMap[groupId]) {
            groupMap[groupId] = [];
            groups.push({
              id: groupId,
              name: groupName,
              traits: [],
              selectedTraits: []
            });
          }
          
          // Extrair categorias das opções
          if (question.options && question.options.length > 0) {
            // Coletar todas as categorias únicas das opções
            const categoryNames = new Set<string>();
            
            question.options.forEach((option: any) => {
              // Verificar se a opção tem uma categoria associada
              if (option.categoryName) {
                categoryNames.add(option.categoryName);
              }
            });
            
            // Se não encontramos categorias, usar os textos das opções como último recurso
            if (categoryNames.size === 0) {
              question.options.forEach((option: any) => {
                if (option.text) {
                  categoryNames.add(option.text);
                }
              });
            }
            
            // Adicionar as categorias encontradas ao grupo
            const groupIndex = groups.findIndex(g => g.id === groupId);
            if (groupIndex !== -1) {
              categoryNames.forEach(categoryName => {
                if (!groupMap[groupId].includes(categoryName)) {
                  groupMap[groupId].push(categoryName);
                  groups[groupIndex].traits.push(categoryName);
                }
              });
            }
          }
        });
      }
      
      console.log('Grupos extraídos:', groups);
      
      // Atualizar o estado com os grupos e traços disponíveis
      setTraitGroups(groups);
      
      // Se houver valores iniciais, inicializar os traços selecionados
      if (value && value.length > 0) {
        console.log('Valores iniciais recebidos:', value);
        const updatedGroups = [...groups];
        
        // Criar mapas para facilitar a busca
        const traitsByName: Record<string, PersonalityTrait[]> = {};
        const traitsById: Record<string, PersonalityTrait> = {};
        
        // Indexar os traços salvos por nome e ID
        value.forEach(trait => {
          // Indexar por ID se disponível
          if (trait.id) {
            traitsById[trait.id] = trait;
          }
          
          // Também indexar por nome para fallback
          if (trait.traitName) {
            if (!traitsByName[trait.traitName]) {
              traitsByName[trait.traitName] = [];
            }
            traitsByName[trait.traitName].push(trait);
          }
        });
        
        console.log('Mapa de traços por ID:', traitsById);
        console.log('Mapa de traços por nome:', traitsByName);
        
        // Para cada grupo, verificar se há traços salvos correspondentes
        updatedGroups.forEach((group, groupIndex) => {
          // Primeiro, tentar encontrar traços salvos pelo ID do grupo
          const savedTraitsByGroup = value.filter(trait => 
            trait.groupId === group.id || trait.groupName === group.name
          );
          
          if (savedTraitsByGroup.length > 0) {
            // Se encontrou traços pelo ID do grupo, usar esses
            console.log(`Encontrados ${savedTraitsByGroup.length} traços para o grupo ${group.name} pelo ID/nome do grupo`);
            
            savedTraitsByGroup.forEach(savedTrait => {
              // Verificar se o traço está disponível no grupo atual
              if (group.traits.includes(savedTrait.traitName)) {
                // Verificar se o traço já existe no grupo
                const existingTraitIndex = group.selectedTraits.findIndex(t => 
                  t.id === savedTrait.id || t.traitName === savedTrait.traitName
                );
                
                if (existingTraitIndex === -1) {
                  // Se o traço não existe, adicionar
                  group.selectedTraits.push({
                    id: savedTrait.id || `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    traitName: savedTrait.traitName,
                    weight: savedTrait.weight || 0,
                    order: savedTrait.order || group.selectedTraits.length + 1,
                    groupId: group.id,
                    groupName: group.name
                  });
                } else {
                  // Se o traço já existe, atualizar
                  group.selectedTraits[existingTraitIndex] = {
                    ...group.selectedTraits[existingTraitIndex],
                    weight: savedTrait.weight || group.selectedTraits[existingTraitIndex].weight,
                    order: savedTrait.order || group.selectedTraits[existingTraitIndex].order
                  };
                }
              }
            });
          } else {
            // Se não encontrou pelo ID do grupo, tentar pelo nome dos traços
            console.log(`Tentando encontrar traços para o grupo ${group.name} pelo nome dos traços`);
            
            // Para cada traço disponível no grupo, verificar se há um valor salvo
            group.traits.forEach(traitName => {
              const matchingTraits = traitsByName[traitName] || [];
              
              if (matchingTraits.length > 0) {
                // Se há múltiplos traços com o mesmo nome, tentar encontrar o que melhor corresponde a este grupo
                // Priorizar traços que têm o mesmo groupId ou groupName
                const bestMatch = matchingTraits.find(t => 
                  t.groupId === group.id || t.groupName === group.name
                ) || matchingTraits[0]; // Fallback para o primeiro se não encontrar correspondência exata
                
                // Verificar se o traço já existe no grupo
                const existingTraitIndex = group.selectedTraits.findIndex(t => 
                  t.traitName === traitName || (t.id && t.id === bestMatch.id)
                );
                
                if (existingTraitIndex === -1) {
                  // Se o traço não existe, adicionar
                  group.selectedTraits.push({
                    id: bestMatch.id || `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    traitName: traitName,
                    weight: bestMatch.weight || 0,
                    order: bestMatch.order || group.selectedTraits.length + 1,
                    groupId: group.id,
                    groupName: group.name
                  });
                } else {
                  // Se o traço já existe, atualizar
                  group.selectedTraits[existingTraitIndex] = {
                    ...group.selectedTraits[existingTraitIndex],
                    weight: bestMatch.weight || group.selectedTraits[existingTraitIndex].weight,
                    order: bestMatch.order || group.selectedTraits[existingTraitIndex].order
                  };
                }
              }
            });
          }
          
          // Ordenar os traços em cada grupo por ordem
          group.selectedTraits.sort((a, b) => a.order - b.order);
        });
        
        // Atualizar o estado
        setTraitGroups(updatedGroups);
        
        console.log('Grupos atualizados com valores iniciais:', updatedGroups);
      }
    } finally {
      setIsLoadingTraits(false);
    }
  }, [value, onChange]);  

  // Calcular o peso com base na ordem
  const calculateWeight = (position: number, totalTraits: number): number => {
    const W_max = 5;
    const W_min = 1;
    const N_g = totalTraits || 1; // Evitar divisão por zero
    
    if (N_g === 1) return W_max; // Se houver apenas um traço, ele tem o peso máximo
    
    // Aplicar a fórmula de normalização
    const weight = W_max - ((position - 1) * (W_max - W_min)) / (N_g - 1);
    
    // Arredondar para 2 casas decimais para evitar problemas de precisão
    const roundedWeight = Math.round(weight * 100) / 100;
    
    // Garantir que o peso esteja dentro dos limites
    return Math.max(W_min, Math.min(W_max, roundedWeight));
  };

  // Adicionar um traço ao grupo
  const handleAddTrait = useCallback((groupId: string, traitName: string) => {
    // Encontrar o grupo
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    // Verificar se o traço já está selecionado no grupo
    const isAlreadySelected = traitGroups[groupIndex].selectedTraits.some(t => t.traitName === traitName);
    if (isAlreadySelected) return;
    
    // Criar uma cópia dos grupos
    const updatedGroups = [...traitGroups];
    
    // Adicionar o traço ao grupo
    const newOrder = updatedGroups[groupIndex].selectedTraits.length + 1;
    
    // Calcular o peso inicial com base na ordem
    const newWeight = calculateWeight(newOrder, newOrder);
    
    // Adicionar o novo traço
    updatedGroups[groupIndex].selectedTraits.push({
      id: `trait-${groupId}-${traitName.replace(/\s+/g, '-').toLowerCase()}`,
      traitName,
      weight: newWeight,
      order: newOrder,
      groupId,
      groupName: updatedGroups[groupIndex].name
    });
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    console.log(`Traço "${traitName}" adicionado ao grupo "${updatedGroups[groupIndex].name}" com peso ${newWeight} e ordem ${newOrder}`);
    
    // Recalcular os pesos para todos os traços no grupo
    const groupTraits = updatedGroups[groupIndex].selectedTraits;
    if (groupTraits.length > 1) {
      // Ordenar os traços pela ordem atual
      const sortedTraits = [...groupTraits].sort((a, b) => a.order - b.order);
      
      // Recalcular os pesos
      updatedGroups[groupIndex].selectedTraits = sortedTraits.map((trait, index) => {
        const calculatedWeight = calculateWeight(index + 1, sortedTraits.length);
        return { ...trait, order: index + 1, weight: calculatedWeight };
      });
      
      console.log(`Pesos recalculados para ${sortedTraits.length} traços no grupo "${updatedGroups[groupIndex].name}"`);
    }
    
    // Armazenar as alterações no buffer local, mas não notificar o componente pai
    pendingChangesRef.current = updatedGroups;
    setHasUnsavedChanges(true);
  }, [traitGroups]);

  // Remover um traço de um grupo
  const handleRemoveTrait = useCallback((traitId: string, groupId: string) => {
    // Encontrar o grupo
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    // Criar uma cópia dos grupos
    const updatedGroups = [...traitGroups];
    
    // Encontrar o traço a ser removido
    const traitIndex = updatedGroups[groupIndex].selectedTraits.findIndex(t => t.id === traitId);
    if (traitIndex === -1) return;
    
    // Obter o nome do traço para logging
    const traitName = updatedGroups[groupIndex].selectedTraits[traitIndex].traitName;
    const groupName = updatedGroups[groupIndex].name;
    
    // Remover o traço
    updatedGroups[groupIndex].selectedTraits.splice(traitIndex, 1);
    
    console.log(`Traço "${traitName}" removido do grupo "${groupName}"`);
    
    // Recalcular os pesos para todos os traços restantes no grupo
    if (updatedGroups[groupIndex].selectedTraits.length > 0) {
      // Reordenar os traços restantes
      const reorderedTraits = updatedGroups[groupIndex].selectedTraits.map((trait, index) => ({
        ...trait,
        order: index + 1
      }));
      
      // Recalcular os pesos com base na nova ordem
      const totalTraits = reorderedTraits.length;
      updatedGroups[groupIndex].selectedTraits = reorderedTraits.map((trait, index) => {
        const calculatedWeight = calculateWeight(index + 1, totalTraits);
        return { ...trait, weight: calculatedWeight };
      });
      
      console.log(`Pesos recalculados para ${totalTraits} traços restantes no grupo "${groupName}"`);
    }
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    // Armazenar as alterações no buffer local, mas não notificar o componente pai
    pendingChangesRef.current = updatedGroups;
    setHasUnsavedChanges(true);
  }, [traitGroups]);

  // Função para normalizar os pesos de todos os traços em todos os grupos
  const normalizeAllWeights = useCallback(() => {
    if (traitGroups.length === 0) return;
    
    const updatedGroups = [...traitGroups];
    let anyChanges = false;
    
    // Para cada grupo, recalcular os pesos com base na ordem atual
    updatedGroups.forEach(group => {
      if (group.selectedTraits.length > 0) {
        // Ordenar os traços pela ordem atual
        const sortedTraits = [...group.selectedTraits].sort((a, b) => a.order - b.order);
        
        // Recalcular os pesos
        const updatedTraits = sortedTraits.map((trait, index) => {
          const newWeight = calculateWeight(index + 1, sortedTraits.length);
          if (trait.weight !== newWeight) {
            anyChanges = true;
            return { ...trait, order: index + 1, weight: newWeight };
          }
          return trait;
        });
        
        group.selectedTraits = updatedTraits;
      }
    });
    
    if (anyChanges) {
      setTraitGroups(updatedGroups);
      
      // Notificar o componente pai sobre a mudança
      notifyParentOfChanges(updatedGroups);
    }
  }, [traitGroups, notifyParentOfChanges]);

  // Executar a normalização quando o componente for montado ou quando os grupos mudarem
  useEffect(() => {
    if (traitGroups.length > 0) {
      normalizeAllWeights();
    }
  }, [normalizeAllWeights, traitGroups.length]);

  // Efeito para buscar traços quando o testId mudar
  useEffect(() => {
    if (testId) {
      console.log('TestId mudou, buscando traços:', testId);
      // Verificar se já inicializamos para este testId para evitar múltiplas requisições
      if (!hasInitializedRef.current[testId]) {
        console.log(`Inicializando traços para o teste ${testId}`);
        hasInitializedRef.current[testId] = true;
        fetchPersonalityTraits(testId);
      }
    } else {
      // Se não houver testId, limpar os grupos
      setTraitGroups([]);
      setError('Selecione um teste para configurar os traços de personalidade.');
    }
  }, [testId, fetchPersonalityTraits]);

  // Mover um traço para cima na lista
  const handleMoveUp = useCallback((groupId: string, index: number) => {
    if (index === 0) return; // Já está no topo
    
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    const updatedGroups = [...traitGroups];
    const traits = [...updatedGroups[groupIndex].selectedTraits];
    
    // Marcar os itens que estão sendo movidos
    const movingUpItem = traits[index];
    const movingDownItem = traits[index - 1];
    
    // Trocar o traço com o anterior
    [traits[index], traits[index - 1]] = [traits[index - 1], traits[index]];
    
    // Atualizar a ordem e os pesos
    updatedGroups[groupIndex].selectedTraits = traits.map((trait, idx) => ({
      ...trait,
      order: idx + 1,
      weight: calculateWeight(idx + 1, traits.length)
    }));
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    // Definir o último item movido para destacá-lo
    setLastMovedItem({id: movingUpItem.id, direction: 'up'});
    
    // Armazenar as alterações no buffer local, mas não notificar o componente pai
    pendingChangesRef.current = updatedGroups;
  }, [traitGroups]);

  // Mover um traço para baixo na lista
  const handleMoveDown = useCallback((groupId: string, index: number) => {
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    const traits = traitGroups[groupIndex].selectedTraits;
    if (index === traits.length - 1) return; // Já está no final
    
    const updatedGroups = [...traitGroups];
    const updatedTraits = [...traits];
    
    // Marcar os itens que estão sendo movidos
    const movingDownItem = updatedTraits[index];
    const movingUpItem = updatedTraits[index + 1];
    
    // Trocar o traço com o próximo
    [updatedTraits[index], updatedTraits[index + 1]] = [updatedTraits[index + 1], updatedTraits[index]];
    
    // Atualizar a ordem e os pesos
    updatedGroups[groupIndex].selectedTraits = updatedTraits.map((trait, idx) => ({
      ...trait,
      order: idx + 1,
      weight: calculateWeight(idx + 1, updatedTraits.length)
    }));
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    // Definir o último item movido para destacá-lo
    setLastMovedItem({id: movingDownItem.id, direction: 'down'});
    
    // Armazenar as alterações no buffer local, mas não notificar o componente pai
    pendingChangesRef.current = updatedGroups;
  }, [traitGroups]);

  useEffect(() => {
    if (lastMovedItem) {
      const timer = setTimeout(() => {
        setLastMovedItem(null);
      }, 1500); // 1.5 segundos
      return () => clearTimeout(timer);
    }
  }, [lastMovedItem]);

  // Inicializar os grupos com os traços já selecionados
  useEffect(() => {
    // Verificar se já temos grupos carregados e valores iniciais
    if (testId && traitGroups.length > 0 && value.length > 0) {
      // Verificar se os valores são iguais aos anteriores para evitar loop infinito
      if (JSON.stringify(value) === JSON.stringify(previousValueRef.current)) {
        console.log('Valores iniciais iguais aos anteriores, evitando re-renderização');
        return;
      }
      
      console.log('Valores iniciais recebidos:', value);
      
      // Atualizar a referência para os valores atuais
      previousValueRef.current = [...value];
      
      // Usar uma referência imutável aos grupos atuais
      const currentGroups = traitGroups;
      
      // Criar uma cópia dos grupos
      const updatedGroups = [...currentGroups];
      let hasChanges = false;
      
      // Para cada traço no valor inicial
      value.forEach(trait => {
        // Encontrar o grupo correspondente
        const groupIndex = updatedGroups.findIndex(g => g.id === trait.groupId || g.name === trait.groupName);
        if (groupIndex !== -1) {
          // Verificar se o traço já existe no grupo
          const existingTraitIndex = updatedGroups[groupIndex].selectedTraits.findIndex(t => 
            t.traitName === trait.traitName || t.id === trait.id
          );
          
          if (existingTraitIndex === -1) {
            // Se o traço não existe, adicionar
            updatedGroups[groupIndex].selectedTraits.push({
              id: trait.id || `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              traitName: trait.traitName,
              weight: trait.weight || 0,
              order: trait.order || updatedGroups[groupIndex].selectedTraits.length + 1,
              groupId: trait.groupId || updatedGroups[groupIndex].id,
              groupName: trait.groupName || updatedGroups[groupIndex].name
            });
            hasChanges = true;
          } else {
            // Se o traço já existe, verificar se precisa atualizar
            const currentTrait = updatedGroups[groupIndex].selectedTraits[existingTraitIndex];
            const needsUpdate = 
              currentTrait.weight !== trait.weight || 
              currentTrait.order !== trait.order;
            
            if (needsUpdate) {
              updatedGroups[groupIndex].selectedTraits[existingTraitIndex] = {
                ...currentTrait,
                weight: trait.weight || currentTrait.weight,
                order: trait.order || currentTrait.order
              };
              hasChanges = true;
            }
          }
        }
      });
      
      // Só atualizar o estado se houver mudanças reais
      if (hasChanges) {
        // Ordenar os traços em cada grupo por ordem
        updatedGroups.forEach(group => {
          group.selectedTraits.sort((a, b) => a.order - b.order);
        });
        
        // Atualizar o estado
        setTraitGroups(updatedGroups);
        
        console.log('Grupos atualizados com valores iniciais:', updatedGroups);
      }
    }
  }, [testId, value, traitGroups]);

  // Verificar se um traço já foi adicionado a um grupo
  const isTraitAddedToGroup = (traitName: string, groupId: string) => {
    const group = traitGroups.find(g => g.id === groupId);
    if (!group) return false;
    
    return group.selectedTraits.some(t => t.traitName.toLowerCase() === traitName.toLowerCase());
  };

  // Gerar um ID único
  const generateId = () => `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Sincronizar as alterações pendentes quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Ativar a flag de sincronização
      shouldSyncRef.current = true;
      
      // Notificar o componente pai sobre as alterações
      if (pendingChangesRef.current.length > 0) {
        notifyParentOfChanges(pendingChangesRef.current);
      }
    };
  }, [notifyParentOfChanges]);

  // Sincronizar as alterações pendentes quando o valor do teste for alterado
  useEffect(() => {
    if (testId) {
      // Verificar se já temos alterações pendentes antes de notificar
      if (pendingChangesRef.current.length > 0) {
        // Ativar a flag de sincronização
        shouldSyncRef.current = true;
        
        // Notificar o componente pai sobre as alterações
        notifyParentOfChanges(pendingChangesRef.current);
      }
    }
  }, [testId, notifyParentOfChanges]);

  // Atualizar a flag de sincronização quando o componente for montado
  useEffect(() => {
    shouldSyncRef.current = true;
  }, []);

  // Atualizar a flag de sincronização quando o componente for desmontado
  useEffect(() => {
    return () => {
      shouldSyncRef.current = false;
    };
  }, []);

  // Componente de item memoizado para melhor performance
  const TraitItem = React.memo(({ trait, index, groupId, onRemove, onMoveUp, onMoveDown }: {
    trait: PersonalityTrait;
    index: number;
    groupId: string;
    onRemove: (id: string, groupId: string) => void;
    onMoveUp: (groupId: string, index: number) => void;
    onMoveDown: (groupId: string, index: number) => void;
  }) => {
    // Determinar a classe de animação com base no último item movido
    const animationClass = lastMovedItem && lastMovedItem.id === trait.id 
      ? lastMovedItem.direction === 'up' 
        ? 'moved-up' 
        : 'moved-down'
      : '';
    
    return (
      <div
        key={trait.id}
        className={`trait-item flex items-center justify-between p-4 rounded-md border ${
          index === 0 
            ? 'bg-blue-50 border-blue-300 shadow-lg' 
            : 'bg-white border-secondary-200'
        } ${animationClass}`}
      >
        <div className="flex items-center space-x-4">
          <div>
            <span className="font-medium text-secondary-800 text-base">{trait.traitName}</span>
            <div className="text-sm text-secondary-500 mt-1">
              Peso: {trait.weight.toFixed(1)} (Posição: {index + 1})
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onMoveUp(groupId, index)}
            disabled={index === 0}
            className={`text-secondary-400 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-secondary-600'}`}
          >
            <ChevronUpIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(groupId, index)}
            disabled={index === traitGroups.find(g => g.id === groupId)?.selectedTraits.length - 1}
            className={`text-secondary-400 ${index === traitGroups.find(g => g.id === groupId)?.selectedTraits.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-secondary-600'}`}
          >
            <ChevronDownIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(trait.id, groupId)}
            className="text-secondary-400 hover:text-red-600 ml-4"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  });

  TraitItem.displayName = 'TraitItem';

  // Componente de área memoizado para melhor performance
  const TraitArea = React.memo(({ group, onRemoveTrait, onMoveUp, onMoveDown }: {
    group: TraitGroup;
    onRemoveTrait: (id: string, groupId: string) => void;
    onMoveUp: (groupId: string, index: number) => void;
    onMoveDown: (groupId: string, index: number) => void;
  }) => {
    return (
      <div
        className="space-y-4 bg-secondary-50 p-3 rounded-md relative"
        style={{ paddingLeft: '25px' }} // Espaço para os indicadores de direção
      >
        {group.selectedTraits
          .sort((a, b) => a.order - b.order)
          .map((trait, index) => (
            <TraitItem 
              key={trait.id} 
              trait={trait} 
              index={index} 
              groupId={group.id} 
              onRemove={onRemoveTrait} 
              onMoveUp={onMoveUp} 
              onMoveDown={onMoveDown} 
            />
          ))}
      </div>
    );
  });

  TraitArea.displayName = 'TraitArea';

  return (
    <div className="space-y-6">
      <style jsx global>{`
        .trait-item {
          transition: all 0.3s ease-in-out;
          position: relative;
        }
        
        .moved-up {
          background-color: #e0f2fe !important;
          border-color: #38bdf8 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transform: translateY(-4px);
        }
        
        .moved-down {
          background-color: #fef3c7 !important;
          border-color: #fbbf24 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transform: translateY(4px);
        }
        
        .moved-up::before {
          content: "▲";
          position: absolute;
          left: -20px;
          color: #38bdf8;
          font-size: 14px;
          animation: pulse 1s infinite;
        }
        
        .moved-down::before {
          content: "▼";
          position: absolute;
          left: -20px;
          color: #fbbf24;
          font-size: 14px;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
      
      {isLoadingTraits ? (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
          <span className="ml-2 text-sm text-secondary-600">Carregando traços de personalidade...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">
          <p className="text-sm font-medium">Erro ao carregar traços de personalidade</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : (
        <>
          {/* Grupos de traços disponíveis */}
          {testId ? (
            traitGroups.length > 0 ? (
              <div className="space-y-8">
                {traitGroups.map(group => (
                  <div key={group.id} className="bg-white p-6 rounded-lg border border-secondary-200 shadow-sm">
                    <h3 className="text-xl font-medium text-secondary-800 mb-4">
                      Grupo: {group.name}
                    </h3>
                    
                    {/* Traços disponíveis para seleção */}
                    <div className="mb-5">
                      <h4 className="text-base font-medium text-secondary-700 mb-3">
                        Traços disponíveis:
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {group.traits.map(trait => (
                          <button
                            key={`${group.id}-${trait}`}
                            type="button"
                            onClick={() => handleAddTrait(group.id, trait)}
                            disabled={isTraitAddedToGroup(trait, group.id)}
                            className={`px-3 py-2 text-sm rounded-full transition-colors ${
                              isTraitAddedToGroup(trait, group.id)
                                ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed'
                                : 'bg-white border border-secondary-300 hover:bg-primary-50 hover:border-primary-300 text-secondary-700'
                            }`}
                          >
                            {trait}
                          </button>
                        ))}
                      </div>
                      
                      {group.traits.every(trait => isTraitAddedToGroup(trait, group.id)) && (
                        <p className="text-xs text-secondary-500 mt-2">
                          Todos os traços deste grupo já foram adicionados.
                        </p>
                      )}
                    </div>
                    
                    {/* Traços selecionados e ordenados */}
                    {group.selectedTraits.length > 0 ? (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-base font-medium text-secondary-700">
                            Priorização de traços ({group.selectedTraits.length}):
                          </h4>
                          <p className="text-sm text-secondary-500">Mover para cima ou para baixo para reordenar por importância</p>
                        </div>
                        
                        <TraitArea 
                          group={group} 
                          onRemoveTrait={handleRemoveTrait} 
                          onMoveUp={handleMoveUp} 
                          onMoveDown={handleMoveDown} 
                        />
                      </div>
                    ) : (
                      <div className="bg-secondary-50 p-5 rounded-lg text-center text-secondary-500 mt-4">
                        <p className="text-base">Selecione traços de personalidade acima para priorizar a importância de cada um na avaliação.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 p-5 rounded-lg">
                <p className="text-base text-yellow-700">
                  Nenhum traço de personalidade encontrado no teste selecionado.
                </p>
                <p className="text-sm text-yellow-600 mt-2">
                  Verifique se o teste contém perguntas opinativas com categorias de personalidade definidas.
                </p>
              </div>
            )
          ) : (
            <div className="bg-blue-50 p-5 rounded-lg">
              <p className="text-base text-blue-700">
                Selecione um teste para carregar os traços de personalidade disponíveis.
              </p>
            </div>
          )}
        </>
      )}
      {hasUnsavedChanges && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSyncChanges}
            className="flex items-center px-4 py-2 rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <span className="mr-2 w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Salvar alterações
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalityTraitWeightConfig;
