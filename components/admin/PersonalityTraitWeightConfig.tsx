import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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

  // Inicializar os grupos com os traços já selecionados
  useEffect(() => {
    if (traitGroups.length > 0 && value.length > 0) {
      const updatedGroups = traitGroups.map(group => {
        const groupTraits = value.filter(trait => trait.groupId === group.id);
        return {
          ...group,
          selectedTraits: groupTraits
        };
      });
      setTraitGroups(updatedGroups);
    }
  }, [value]);

  // Buscar traços de personalidade do teste selecionado
  useEffect(() => {
    if (testId) {
      fetchPersonalityTraits(testId);
    } else {
      // Limpar traços disponíveis se não houver teste selecionado
      setTraitGroups([]);
    }
  }, [testId]);

  // Função para buscar traços de personalidade do teste selecionado
  const fetchPersonalityTraits = async (testId: string) => {
    try {
      setIsLoadingTraits(true);
      setError(null);
      
      // Buscar as questões do teste
      const response = await fetch(`/api/admin/questions?testId=${testId}&type=OPINION_MULTIPLE`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar questões: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mapa para agrupar traços por questionId ou categoryId
      const groupsMap = new Map<string, TraitGroup>();
      
      if (data && Array.isArray(data)) {
        data.forEach(question => {
          // Criar um grupo para cada questão
          const groupId = question.id;
          const groupName = question.text.substring(0, 50) + (question.text.length > 50 ? '...' : '');
          
          if (!groupsMap.has(groupId)) {
            groupsMap.set(groupId, {
              id: groupId,
              name: groupName,
              traits: [],
              selectedTraits: []
            });
          }
          
          if (question.options && Array.isArray(question.options)) {
            question.options.forEach(option => {
              let traitName = null;
              
              // Verificar tanto categoryName quanto extrair do texto da opção (entre parênteses)
              if (option.categoryName) {
                traitName = option.categoryName;
              } else {
                // Tentar extrair do texto da opção (formato: "Texto da opção (Nome da personalidade)")
                const match = option.text.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                  traitName = match[1].trim();
                }
              }
              
              if (traitName && !groupsMap.get(groupId).traits.includes(traitName)) {
                groupsMap.get(groupId).traits.push(traitName);
              }
            });
          }
        });
      }
      
      // Converter Map para array e ordenar grupos
      const groupsArray = Array.from(groupsMap.values())
        .filter(group => group.traits.length > 0)
        .map(group => ({
          ...group,
          traits: group.traits.sort(), // Ordenar traços alfabeticamente
          selectedTraits: [] // Inicializar com array vazio
        }));
      
      // Associar traços existentes aos seus respectivos grupos
      if (value.length > 0) {
        groupsArray.forEach(group => {
          const groupTraits = value.filter(trait => trait.groupId === group.id);
          group.selectedTraits = [...groupTraits].sort((a, b) => a.order - b.order);
        });
      }
      
      setTraitGroups(groupsArray);
    } catch (error) {
      console.error('Erro ao buscar traços de personalidade:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao buscar traços de personalidade');
    } finally {
      setIsLoadingTraits(false);
    }
  };

  // Gerar um ID único
  const generateId = () => `trait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Adicionar um traço a um grupo específico
  const addTraitToGroup = (traitName: string, groupId: string, groupName: string) => {
    // Encontrar o grupo
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    // Verificar se o traço já existe no grupo
    if (traitGroups[groupIndex].selectedTraits.some(t => t.traitName.toLowerCase() === traitName.toLowerCase())) {
      return;
    }

    // Criar uma cópia dos grupos
    const updatedGroups = [...traitGroups];
    
    // Adicionar o traço ao grupo específico
    const newTrait: PersonalityTrait = {
      id: generateId(),
      traitName,
      weight: calculateWeight(updatedGroups[groupIndex].selectedTraits.length + 1, 5),
      order: updatedGroups[groupIndex].selectedTraits.length + 1,
      groupId,
      groupName
    };
    
    updatedGroups[groupIndex].selectedTraits.push(newTrait);
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    // Notificar o componente pai sobre a mudança
    const allTraits = updatedGroups.flatMap(group => group.selectedTraits);
    onChange(allTraits);
  };

  // Remover um traço de um grupo específico
  const removeTraitFromGroup = (traitId: string, groupId: string) => {
    // Encontrar o grupo
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    // Criar uma cópia dos grupos
    const updatedGroups = [...traitGroups];
    
    // Remover o traço do grupo
    updatedGroups[groupIndex].selectedTraits = updatedGroups[groupIndex].selectedTraits
      .filter(t => t.id !== traitId)
      .map((trait, idx) => ({
        ...trait,
        order: idx + 1,
        weight: calculateWeight(idx + 1, 5)
      }));
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    // Notificar o componente pai sobre a mudança
    const allTraits = updatedGroups.flatMap(group => group.selectedTraits);
    onChange(allTraits);
  };

  // Calcular o peso com base na ordem
  const calculateWeight = (position: number, totalTraits: number): number => {
    // Implementação da fórmula: W_a = W_max - ((P_a - 1) * (W_max - W_min)) / (N_g - 1)
    const W_max = 5;
    const W_min = 1;
    const N_g = totalTraits || 1; // Evitar divisão por zero
    
    if (N_g === 1) return W_max; // Se houver apenas um traço, ele tem o peso máximo
    
    return W_max - ((position - 1) * (W_max - W_min)) / (N_g - 1);
  };

  // Lidar com o reordenamento por drag and drop dentro de um grupo
  const handleDragEnd = (result: any, groupId: string) => {
    if (!result.destination) return;
    
    // Encontrar o grupo
    const groupIndex = traitGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    // Criar uma cópia dos grupos
    const updatedGroups = [...traitGroups];
    
    // Reordenar os traços dentro do grupo
    const items = Array.from(updatedGroups[groupIndex].selectedTraits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Atualizar a ordem e os pesos
    updatedGroups[groupIndex].selectedTraits = items.map((trait, index) => ({
      ...trait,
      order: index + 1,
      weight: calculateWeight(index + 1, items.length)
    }));
    
    // Atualizar o estado
    setTraitGroups(updatedGroups);
    
    // Notificar o componente pai sobre a mudança
    const allTraits = updatedGroups.flatMap(group => group.selectedTraits);
    onChange(allTraits);
  };

  // Verificar se um traço já foi adicionado a um grupo
  const isTraitAddedToGroup = (traitName: string, groupId: string) => {
    const group = traitGroups.find(g => g.id === groupId);
    if (!group) return false;
    
    return group.selectedTraits.some(t => t.traitName.toLowerCase() === traitName.toLowerCase());
  };

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
              <div className="space-y-8">
                {traitGroups.map(group => (
                  <div key={group.id} className="bg-white p-6 rounded-lg border border-secondary-200 shadow-sm">
                    <h3 className="text-lg font-medium text-secondary-800 mb-3">
                      Grupo: {group.name}
                    </h3>
                    
                    {/* Traços disponíveis para seleção */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-secondary-700 mb-2">
                        Traços disponíveis:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {group.traits.map(trait => (
                          <button
                            key={`${group.id}-${trait}`}
                            type="button"
                            onClick={() => addTraitToGroup(trait, group.id, group.name)}
                            disabled={isTraitAddedToGroup(trait, group.id)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
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
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-secondary-700">
                            Priorização de traços ({group.selectedTraits.length}):
                          </h4>
                          <p className="text-xs text-secondary-500">Arraste para reordenar por importância</p>
                        </div>
                        
                        <DragDropContext onDragEnd={(result) => handleDragEnd(result, group.id)}>
                          <Droppable droppableId={`group-${group.id}`}>
                            {(provided) => (
                              <ul
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2 bg-secondary-50 p-3 rounded-md"
                              >
                                {group.selectedTraits.map((trait, index) => (
                                  <Draggable 
                                    key={trait.id} 
                                    draggableId={trait.id || `trait-${group.id}-${index}`} 
                                    index={index}
                                  >
                                    {(provided) => (
                                      <li
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center justify-between bg-white p-3 rounded-md border border-secondary-200 shadow-sm"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="cursor-move text-secondary-400 hover:text-secondary-600"
                                          >
                                            <ArrowsUpDownIcon className="h-5 w-5" />
                                          </div>
                                          <div>
                                            <span className="font-medium text-secondary-800">{trait.traitName}</span>
                                            <div className="text-xs text-secondary-500">
                                              Peso: {trait.weight.toFixed(1)} (Posição: {index + 1})
                                            </div>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeTraitFromGroup(trait.id, group.id)}
                                          className="text-secondary-400 hover:text-red-600"
                                        >
                                          <XMarkIcon className="h-5 w-5" />
                                        </button>
                                      </li>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </ul>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                    ) : (
                      <div className="bg-secondary-50 p-4 rounded-lg text-center text-secondary-500 mt-4">
                        Selecione traços de personalidade acima para priorizar a importância de cada um na avaliação.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Nenhum traço de personalidade encontrado no teste selecionado.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Verifique se o teste contém perguntas opinativas com categorias de personalidade definidas.
                </p>
              </div>
            )
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
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
