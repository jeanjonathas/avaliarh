import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { PlusIcon, XMarkIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

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
  const valueRef = useRef<PersonalityTrait[]>(value);

  // Atualizar a referência quando o valor mudar
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Função para buscar traços de personalidade do teste selecionado
  const loadTraitsFromTest = useCallback(async () => {
    setIsLoadingTraits(true);
    setError(null);
    
    if (!testId) {
      setError('Nenhum teste selecionado');
      setIsLoadingTraits(false);
      return;
    }
    
    try {
      console.log('Carregando traços de personalidade do teste:', testId);
      
      // Buscar perguntas opinativas do teste
      const response = await fetch(`/api/admin/questions?testId=${testId}&type=OPINION_MULTIPLE`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar perguntas: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      // Verificar se a resposta é um objeto com propriedade 'items' ou um array direto
      const data = responseData.items || responseData;
      const questions = Array.isArray(data) ? data : [];
      
      console.log('Resposta da API:', responseData);
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
      
      // Primeiro, vamos tentar criar um grupo para cada pergunta opinativa
      questions.forEach((question: any) => {
        console.log(`Processando questão ${question.id}:`, question);
        
        if (question.options && question.options.length > 0) {
          // Criar um grupo para esta pergunta
          const questionGroup: TraitGroup = {
            id: `question-${question.id}`,
            name: `Pergunta: ${question.text?.substring(0, 30)}...` || `Pergunta ${question.id}`,
            traits: [],
            selectedTraits: []
          };
          
          // Coletar todas as categorias únicas das opções desta pergunta
          const uniqueTraits = new Set<string>();
          
          question.options.forEach((option: any) => {
            console.log(`Opção ${option.id}:`, option);
            
            // Tentar extrair a categoria da opção de várias formas possíveis
            const categoryName = option.categoryName || 
                                (option.category && option.category.name) ||
                                option.categoryId ||
                                option.text; // Usar o texto da opção como fallback
            
            if (categoryName) {
              console.log(`Encontrado traço de personalidade: ${categoryName}`);
              uniqueTraits.add(categoryName);
            } else {
              console.log(`Opção ${option.id} não tem categoria definida, usando texto da opção`);
              // Se não encontrarmos uma categoria, usar o texto da opção como traço
              if (option.text) {
                uniqueTraits.add(option.text);
              }
            }
          });
          
          // Adicionar todas as categorias únicas ao grupo da pergunta
          questionGroup.traits = Array.from(uniqueTraits);
          
          if (questionGroup.traits.length > 0) {
            console.log(`Adicionando grupo para pergunta ${question.id} com ${questionGroup.traits.length} traços:`, questionGroup.traits);
            groups.push(questionGroup);
          } else {
            console.log(`Pergunta ${question.id} não tem traços de personalidade definidos`);
          }
        } else {
          console.log(`Questão ${question.id} não tem opções`);
        }
      });
      
      // Se não conseguimos criar grupos por pergunta, tentar buscar grupos de opinião
      if (groups.length === 0) {
        try {
          const opinionGroupsResponse = await fetch('/api/admin/opinion-groups');
          if (opinionGroupsResponse.ok) {
            const opinionGroups = await opinionGroupsResponse.json();
            console.log('Grupos de opinião encontrados:', opinionGroups);
            
            if (opinionGroups && opinionGroups.length > 0) {
              // Criar um grupo para cada grupo de opinião
              opinionGroups.forEach((group: any) => {
                const groupId = group.id;
                groups.push({
                  id: groupId,
                  name: group.name,
                  traits: [],
                  selectedTraits: []
                });
                
                // Verificar se há perguntas com categorias que pertencem a este grupo
                questions.forEach((question: any) => {
                  if (question.options && question.options.length > 0) {
                    question.options.forEach((option: any) => {
                      // Verificar se a opção tem uma categoria associada ao grupo atual
                      const category = option.categoryName || option.categoryId;
                      const groupIndex = groups.findIndex(g => g.id === groupId);
                      
                      if (category && groupIndex !== -1 && !groups[groupIndex].traits.includes(category)) {
                        groups[groupIndex].traits.push(category);
                      }
                    });
                  }
                });
              });
              
              // Remover grupos sem traços
              const filteredGroups = groups.filter(group => group.traits.length > 0);
              if (filteredGroups.length > 0) {
                groups.length = 0;
                groups.push(...filteredGroups);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar grupos de opinião:', error);
        }
      }
      
      // Se ainda não temos grupos, criar um grupo padrão
      if (groups.length === 0) {
        console.log('Criando grupo padrão para todas as categorias');
        
        // Criar um grupo padrão para todas as categorias
        const defaultGroup: TraitGroup = {
          id: 'default-group',
          name: 'Traços de Personalidade',
          traits: [],
          selectedTraits: []
        };
        
        // Coletar todas as categorias únicas das opções
        const uniqueTraits = new Set<string>();
        
        questions.forEach((question: any) => {
          if (question.options && question.options.length > 0) {
            question.options.forEach((option: any) => {
              const categoryName = option.categoryName || 
                                  (option.category && option.category.name) ||
                                  option.categoryId ||
                                  option.text; // Usar o texto da opção como fallback
              
              if (categoryName) {
                uniqueTraits.add(categoryName);
              }
            });
          }
        });
        
        // Adicionar todas as categorias únicas ao grupo padrão
        defaultGroup.traits = Array.from(uniqueTraits);
        
        if (defaultGroup.traits.length > 0) {
          groups.push(defaultGroup);
        }
      }
      
      // Se ainda não temos grupos, criar um grupo vazio
      if (groups.length === 0) {
        console.log('Nenhum traço de personalidade encontrado. Criando grupo vazio.');
        groups.push({
          id: 'empty-group',
          name: 'Traços de Personalidade',
          traits: [],
          selectedTraits: []
        });
      }
      
      console.log('Grupos finais:', groups);
      
      // Inicializar os traços selecionados com base nos valores existentes
      const currentValue = valueRef.current; // Usar a referência em vez do valor direto
      
      if (currentValue && currentValue.length > 0) {
        console.log('Distribuindo traços selecionados nos grupos:', currentValue);
        
        // Primeiro, vamos criar um mapa de grupos por ID para facilitar a busca
        const groupsById: Record<string, TraitGroup> = {};
        groups.forEach(group => {
          groupsById[group.id] = group;
          group.selectedTraits = []; // Limpar os traços selecionados
        });
        
        // Tentar distribuir os traços nos grupos corretos
        currentValue.forEach(trait => {
          // Se o traço já tem um groupId e esse grupo existe, adicionar ao grupo correto
          if (trait.groupId && groupsById[trait.groupId]) {
            groupsById[trait.groupId].selectedTraits.push({...trait});
            console.log(`Adicionando traço "${trait.traitName}" ao grupo "${groupsById[trait.groupId].name}" pelo groupId`);
          } else {
            // Se não tem groupId ou o grupo não existe, procurar um grupo que contenha o traço
            let found = false;
            
            for (const group of groups) {
              if (group.traits.includes(trait.traitName)) {
                group.selectedTraits.push({...trait, groupId: group.id});
                console.log(`Adicionando traço "${trait.traitName}" ao grupo "${group.name}" pelo nome do traço`);
                found = true;
                break;
              }
            }
            
            // Se ainda não encontrou, adicionar ao primeiro grupo
            if (!found && groups.length > 0) {
              console.log(`Traço "${trait.traitName}" não encontrado em nenhum grupo, adicionando ao primeiro grupo`);
              groups[0].selectedTraits.push({...trait, groupId: groups[0].id});
            }
          }
        });
        
        // Verificar se algum grupo ficou sem traços selecionados
        const emptyGroups = groups.filter(group => group.selectedTraits.length === 0);
        if (emptyGroups.length > 0) {
          console.log(`${emptyGroups.length} grupos ficaram sem traços selecionados:`, emptyGroups.map(g => g.name));
        }
      }
      
      setTraitGroups(groups);
    } catch (error) {
      console.error('Erro ao carregar traços de personalidade:', error);
      setError(`Erro ao carregar traços de personalidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoadingTraits(false);
    }
  }, [testId]); // Usando apenas testId como dependência para evitar looping

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

  // Notificar o componente pai sobre a mudança
  const notifyParentOfChanges = useCallback((updatedGroups: TraitGroup[]) => {
    // Extrair todos os traços de todos os grupos
    const allTraits = updatedGroups.flatMap(group => group.selectedTraits);
    
    // Garantir que cada traço tenha todas as propriedades necessárias
    const completeTraits = allTraits.map(trait => ({
      id: trait.id,
      traitName: trait.traitName,
      weight: trait.weight,
      order: trait.order,
      groupId: trait.groupId,
      groupName: trait.groupName
    }));
    
    // Agrupar traços por grupo para melhor visualização nos logs
    const traitsByGroup = updatedGroups.reduce((acc, group) => {
      if (group.selectedTraits.length > 0) {
        acc[group.name] = group.selectedTraits.map(trait => ({
          traitName: trait.traitName,
          weight: trait.weight,
          order: trait.order
        }));
      }
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('=== VALORES DE PESO CAPTURADOS ===');
    console.log('Traços atualizados:', completeTraits);
    
    // Log detalhado por categoria
    console.log('=== VALORES DE PESO POR CATEGORIA ===');
    Object.entries(traitsByGroup).forEach(([groupName, traits]) => {
      console.log(`Categoria: ${groupName}`);
      console.table(traits.map(t => ({
        'Traço': t.traitName,
        'Peso': t.weight,
        'Ordem': t.order
      })));
    });
    
    // Log de resumo
    console.log('=== RESUMO DE PESOS SALVOS ===');
    console.log(`Total de traços: ${completeTraits.length}`);
    console.log(`Total de categorias: ${Object.keys(traitsByGroup).length}`);
    console.log('Valores de peso por categoria salvos:', traitsByGroup);
    
    // Enviar os traços completos para o componente pai
    onChange(completeTraits);
  }, [onChange]);

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
    
    // Notificar o componente pai sobre a mudança
    notifyParentOfChanges(updatedGroups);
  }, [traitGroups, notifyParentOfChanges]);

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
    
    // Notificar o componente pai sobre a mudança
    notifyParentOfChanges(updatedGroups);
  }, [traitGroups, notifyParentOfChanges]);

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
      loadTraitsFromTest();
    } else {
      // Se não houver testId, limpar os grupos
      setTraitGroups([]);
      setError(null);
    }
  }, [testId, loadTraitsFromTest]);

  useEffect(() => {
    if (testId) {
      // Verificar se já inicializamos para este testId
      if (!hasInitializedRef.current[testId]) {
        console.log(`Inicializando traços para o teste ${testId}`);
        hasInitializedRef.current[testId] = true;
      }
    }
  }, [testId]);

  // Lidar com o reordenamento por drag and drop dentro de um grupo
  const handleDragEnd = useCallback((result: DropResult) => {
    // Se não houver destino ou se a origem e o destino forem iguais, não fazer nada
    if (!result.destination) return;
    
    // Extrair o ID do grupo do droppableId
    const groupId = result.source.droppableId.replace('droppable-', '');
    
    // Encontrar o grupo
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    // Criar uma cópia dos grupos
    const updatedGroups = [...traitGroups];
    
    // Reordenar os traços dentro do grupo
    const items = Array.from(updatedGroups[groupIndex].selectedTraits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Atualizar as ordens e pesos dos traços
    const updatedTraits = items.map((trait, index) => {
      const newOrder = index + 1;
      const newWeight = calculateWeight(newOrder, items.length);
      
      // Verificar se houve mudança na ordem ou no peso
      if (trait.order !== newOrder || trait.weight !== newWeight) {
        console.log(`Traço "${trait.traitName}" reordenado: ordem ${trait.order} -> ${newOrder}, peso ${trait.weight} -> ${newWeight}`);
        return { ...trait, order: newOrder, weight: newWeight };
      }
      
      return trait;
    });
    
    // Atualizar os traços do grupo
    updatedGroups[groupIndex].selectedTraits = updatedTraits;
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    console.log(`Reordenamento concluído no grupo "${updatedGroups[groupIndex].name}"`);
    console.log('Nova ordem dos traços:', updatedTraits.map(t => ({ nome: t.traitName, ordem: t.order, peso: t.weight })));
    
    // Notificar o componente pai sobre a mudança
    notifyParentOfChanges(updatedGroups);
  }, [traitGroups, notifyParentOfChanges]);

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

  // Gerar um ID único
  const generateId = () => `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Verificar se um traço já foi adicionado a um grupo
  const isTraitAddedToGroup = (traitName: string, groupId: string) => {
    const group = traitGroups.find(g => g.id === groupId);
    if (!group) return false;
    
    return group.selectedTraits.some(t => t.traitName.toLowerCase() === traitName.toLowerCase());
  };

  // Componente de item arrastável memoizado para melhor performance
  const DraggableItem = React.memo(({ trait, index, groupId, onRemove }: {
    trait: PersonalityTrait;
    index: number;
    groupId: string;
    onRemove: (id: string, groupId: string) => void;
  }) => {
    return (
      <Draggable
        key={trait.id}
        draggableId={trait.id}
        index={index}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            className={`flex items-center justify-between p-4 rounded-md border ${
              snapshot.isDragging 
                ? 'bg-blue-50 border-blue-300 shadow-lg' 
                : 'bg-white border-secondary-200'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="cursor-move text-secondary-400 hover:text-secondary-600">
                <ArrowsUpDownIcon className="h-6 w-6" />
              </div>
              <div>
                <span className="font-medium text-secondary-800 text-base">{trait.traitName}</span>
                <div className="text-sm text-secondary-500 mt-1">
                  Peso: {trait.weight.toFixed(1)} (Posição: {index + 1})
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(trait.id, groupId)}
              className="text-secondary-400 hover:text-red-600 ml-4"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}
      </Draggable>
    );
  });

  DraggableItem.displayName = 'DraggableItem';

  // Componente de área soltável memoizado para melhor performance
  const DroppableArea = React.memo(({ group, onRemoveTrait }: {
    group: TraitGroup;
    onRemoveTrait: (id: string, groupId: string) => void;
  }) => {
    return (
      <Droppable droppableId={`droppable-${group.id}`}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-2 bg-secondary-50 p-3 rounded-md"
          >
            {group.selectedTraits
              .sort((a, b) => a.order - b.order)
              .map((trait, index) => (
                <DraggableItem 
                  key={trait.id} 
                  trait={trait} 
                  index={index} 
                  groupId={group.id} 
                  onRemove={onRemoveTrait} 
                />
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  });

  DroppableArea.displayName = 'DroppableArea';

  return (
    <div className="space-y-6">
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
              <DragDropContext onDragEnd={handleDragEnd}>
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
                            <p className="text-sm text-secondary-500">Arraste para reordenar por importância</p>
                          </div>
                          
                          <DroppableArea 
                            group={group} 
                            onRemoveTrait={handleRemoveTrait} 
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
              </DragDropContext>
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
    </div>
  );
};

export default PersonalityTraitWeightConfig;
