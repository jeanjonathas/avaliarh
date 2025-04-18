import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import Toast from '../ui/Toast';
import { Button } from '../ui/Button';
import { QuestionDifficulty, QuestionType } from '../../types/questions';

// Função para gerar UUID v4 compatível com navegador
function generateUUID() {
  // https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface OpinionGroup {
  id: string;
  name: string;
  uuid?: string;
  categories: {
    id: string;
    name: string;
    description?: string;
    uuid?: string;
  }[];
}

interface CategoryField {
  id: string;
  name: string;
  description?: string;
  uuid: string;
}

interface OptionField {
  id?: string;
  text: string;
  categoryNameUuid: string;
  category: string;
  weight: number;
  position: number;
}

interface OpinionQuestionWizardProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  initialData?: any;
  isEditing?: boolean;
  questionType?: string;
  categoriesEndpoint?: string;
}

interface SystemCategory {
  id: string;
  name: string;
  description?: string;
}

const OpinionQuestionWizard: React.FC<OpinionQuestionWizardProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData = null,
  isEditing = false,
  questionType,
  categoriesEndpoint
}) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [opinionGroups, setOpinionGroups] = useState<OpinionGroup[]>([]);
  const [systemCategories, setSystemCategories] = useState<SystemCategory[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OpinionGroup | null>(null);
  const [originalCategories, setOriginalCategories] = useState<{[key: string]: string}>({});
  const [originalCategoryCount, setOriginalCategoryCount] = useState(0);
  const [categoriesModified, setCategoriesModified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('warning');
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupUuid, setNewGroupUuid] = useState<string>(''); 
  const firstEmptyCategoryRef = React.useRef<HTMLInputElement>(null);
  const hasLoadedGroupsRef = useRef(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      type: QuestionType.OPINION_MULTIPLE,
      text: '',
      difficulty: QuestionDifficulty.MEDIUM,
      categories: [],
      options: [],
      initialExplanation: '',
      showExplanation: false,
    }
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
    control,
    name: 'categories'
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: 'options'
  });

  useEffect(() => {
    // Não verificar mais se já carregamos os grupos, sempre carregar novamente
    console.log("Iniciando carregamento de grupos de opinião e categorias...");
    
    // Função para carregar grupos de opinião
    const fetchOpinionGroups = async () => {
      try {
        console.log("Buscando grupos de opinião...");
        // Determinar o tipo de questão (selection ou training)
        const qType = questionType || 'selection';
        console.log(`Tipo de questão para busca: ${qType}`);
        
        const response = await fetch(`/api/admin/opinion-groups?questionType=${qType}&_=${Date.now()}`, {
          // Adicionar cabeçalhos para evitar problemas de cache
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar grupos de opinião: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Grupos de opinião carregados com sucesso: ${data.length}`);
        setOpinionGroups(data);
        hasLoadedGroupsRef.current = true;
      } catch (error) {
        console.error('Erro ao carregar grupos de opinião:', error);
        // Mesmo em caso de erro, marcar como carregado para não tentar novamente
        hasLoadedGroupsRef.current = true;
      }
    };
    
    // Função para buscar categorias do sistema
    const fetchSystemCategories = async () => {
      try {
        console.log("Buscando categorias do sistema...");
        // Usar o endpoint personalizado se fornecido, caso contrário usar o padrão
        const endpoint = categoriesEndpoint || '/api/admin/categories';
        console.log(`Usando endpoint para categorias: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          // Adicionar cabeçalhos para evitar problemas de cache
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar categorias do sistema: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Categorias do sistema carregadas com sucesso: ${data.length}`);
        setSystemCategories(data);
      } catch (error) {
        console.error('Erro ao carregar categorias do sistema:', error);
        // Mesmo em caso de erro, não tentaremos carregar novamente
      }
    };

    // Executar as funções de carregamento em paralelo
    Promise.all([fetchOpinionGroups(), fetchSystemCategories()])
      .then(() => console.log("Carregamento de dados concluído"))
      .catch(error => console.error("Erro durante o carregamento de dados:", error));
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intencionalmente sem dependências para executar apenas uma vez na montagem

  // Carregar dados iniciais se estiver em modo de edição
  useEffect(() => {
    if (initialData && isEditing) {
      // Preencher o formulário com os dados da pergunta
      setValue('text', initialData.text || '');
      setValue('stageId', initialData.stageId || '');
      setValue('categoryId', initialData.categoryId || '');
      setValue('initialExplanation', initialData.initialExplanation || '');
      setValue('difficulty', initialData.difficulty || 'MEDIUM');
      
      // Preparar categorias e opções
      if (initialData.opinionGroup) {
        const group = initialData.opinionGroup;
        
        // Configurar categorias
        const categories = group.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || '',
          uuid: cat.uuid || generateUUID()
        }));
        
        // Configurar opções
        const options = initialData.options.map((opt: any) => {
          const category = group.categories.find((c: any) => c.name === opt.category);
          return {
            id: opt.id, // Manter o ID original se estiver editando
            text: opt.text,
            categoryNameUuid: category?.uuid || generateUUID(),
            category: opt.category,
            weight: opt.weight !== undefined ? opt.weight : 1,
            position: opt.position || 0
          };
        });
        
        // Definir valores no formulário
        setValue('categories', categories);
        setValue('options', options);
        
        // Salvar grupo selecionado e configurar estado original
        setSelectedGroup(group);
        
        // Salvar as categorias originais para posterior comparação
        const origCats: {[key: string]: string} = {};
        group.categories.forEach((category: any) => {
          if (category.uuid) {
            origCats[category.uuid] = category.name;
          }
        });
        setOriginalCategories(origCats);
        setOriginalCategoryCount(group.categories.length);
        setCategoriesModified(false);
      }
    }
  }, [initialData, isEditing, setValue]);

  // Efeito para inicializar os pesos das opções quando o componente é montado
  useEffect(() => {
    const options = watch('options');
    if (options && options.length > 0) {
      // Verificar se os pesos estão todos com valor 1
      const allWeightsAreOne = options.every(opt => opt.weight === 1);
      
      // Se todos os pesos forem 1, recalcular os pesos
      if (allWeightsAreOne) {
        console.log('Inicializando pesos das opções...');
        const updatedOptions = options.map((option, index) => ({
          ...option,
          weight: calculateWeight(index, options.length)
        }));
        
        console.log('Pesos recalculados:', updatedOptions.map(o => o.weight));
        setValue('options', updatedOptions);
      }
    }
  }, [watch, setValue]);

  // Função para criar um novo grupo de categorias
  const handleCreateNewGroup = () => {
    // Limpar categorias existentes
    setValue('categories', [
      { name: '', description: '', uuid: generateUUID() },
      { name: '', description: '', uuid: generateUUID() }
    ]);
    
    // Limpar opções existentes e criar duas opções vazias
    setValue('options', [
      { text: '', categoryNameUuid: watch('categories')[0].uuid, category: '', weight: 1, position: 0 },
      { text: '', categoryNameUuid: watch('categories')[1].uuid, category: '', weight: 1, position: 1 }
    ]);
    
    // Resetar o grupo selecionado
    setSelectedGroup(null);
    
    // Gerar um UUID para o novo grupo
    const groupUuid = generateUUID();
    setNewGroupUuid(groupUuid);
    
    // Marcar que estamos criando um novo grupo
    setIsCreatingNewGroup(true);
    
    // Focar no primeiro campo de categoria após renderização
    setTimeout(() => {
      if (firstEmptyCategoryRef.current) {
        firstEmptyCategoryRef.current.focus();
      }
    }, 100);
  };

  const handleSelectGroup = (groupId: string) => {
    const group = opinionGroups.find(g => g.id === groupId);
    if (group) {
      console.log('Grupo selecionado:', group.name);
      
      // Criar arrays para as novas categorias e opções
      const newCategories = [];
      const newOptions = [];
      
      // Adicionar categorias do grupo
      group.categories.forEach(category => {
        const uuid = category.uuid || generateUUID();
        newCategories.push({
          id: category.id,
          name: category.name,
          description: category.description || '',
          uuid: uuid
        });
        
        // Adicionar opções para cada categoria
        newOptions.push({
          text: '',
          categoryNameUuid: uuid,
          category: category.name, // Garantir que o nome da categoria seja definido corretamente
          weight: 1,
          position: newOptions.length
        });
      });
      
      console.log('Categorias configuradas:', newCategories);
      console.log('Opções configuradas:', newOptions);
      
      // Definir categorias e opções de uma vez
      setValue('categories', newCategories);
      setValue('options', newOptions);
      
      // Atualizar explicitamente o estado do formulário para garantir que as mudanças sejam aplicadas
      setTimeout(() => {
        const updatedOptions = watch('options');
        const updatedCategories = watch('categories');
        
        console.log('Categorias após atualização:', updatedCategories);
        console.log('Opções após atualização:', updatedOptions);
        
        // Verificar se as categorias foram corretamente associadas às opções
        const fixedOptions = updatedOptions.map((option, index) => {
          if (index < updatedCategories.length) {
            return {
              ...option,
              category: updatedCategories[index].name,
              categoryNameUuid: updatedCategories[index].uuid
            };
          }
          return option;
        });
        
        setValue('options', fixedOptions);
      }, 100);
      
      // Salvar as categorias originais para posterior comparação
      const origCats: {[key: string]: string} = {};
      group.categories.forEach((category: any) => {
        if (category.uuid) {
          origCats[category.uuid] = category.name;
        }
      });
      setOriginalCategories(origCats);
      setOriginalCategoryCount(group.categories.length);
      setCategoriesModified(false);
      
      // Definir o grupo selecionado após configurar os campos
      setSelectedGroup(group);
    }
  };

  const handleAddCategory = () => {
    const categoryUuid = generateUUID();
    setValue('categories', [...watch('categories'), {
      name: '',
      description: '',
      uuid: categoryUuid
    }]);
    
    // Se um grupo foi selecionado, marcar como modificado quando adicionar nova categoria
    if (selectedGroup) {
      setCategoriesModified(true);
    }
    
    setValue('options', [...watch('options'), {
      text: '',
      categoryNameUuid: categoryUuid,
      category: '',
      weight: 1,
      position: watch('options').length
    }]);
  };

  const handleRemoveCategory = (index: number) => {
    const categories = watch('categories');
    const options = watch('options');
    categories.splice(index, 1);
    options.splice(index, 1);
    setValue('categories', categories);
    setValue('options', options);
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Verificar se há categorias definidas
      const currentCategories = watch('categories');
      
      if (currentCategories.length === 0) {
        // Mostrar mensagem de aviso usando o Toast
        setToastMessage('Por favor, adicione pelo menos uma categoria antes de avançar.');
        setToastType('warning');
        setShowToast(true);
        
        // Esconder o toast após alguns segundos
        setTimeout(() => {
          setShowToast(false);
        }, 100);
        
        return;
      }
      
      // Verificar se o número de opções corresponde ao número de categorias
      const currentOptions = watch('options');
      
      // Se o número de opções não corresponder ao número de categorias, ajustar
      if (currentOptions.length !== currentCategories.length) {
        console.log(`Ajustando opções: de ${currentOptions.length} para ${currentCategories.length} opções`);
        
        // Criar um novo array de opções em vez de manipular diretamente o optionFields
        const newOptions = [];
        
        // Adicionar uma opção para cada categoria
        currentCategories.forEach((category, index) => {
          // Calcular o peso com base na posição
          const totalOptions = currentCategories.length;
          const weight = calculateWeight(index, totalOptions);
          
          console.log(`Categoria ${index + 1}/${totalOptions}: ${category.name}, peso calculado: ${weight}`);
          
          newOptions.push({
            text: '',
            categoryNameUuid: category.uuid || generateUUID(),
            category: category.name,
            weight: weight,
            position: index
          });
        });
        
        // Definir todas as opções de uma vez
        setValue('options', newOptions);
        
        // Verificar se os pesos foram definidos corretamente
        console.log('Opções com pesos definidos:', newOptions);
      } else {
        // Mesmo que o número de opções corresponda, atualizar os pesos
        const updatedOptions = currentOptions.map((option, index) => ({
          ...option,
          weight: calculateWeight(index, currentOptions.length)
        }));
        
        console.log('Atualizando pesos das opções existentes:', updatedOptions.map(o => o.weight));
        setValue('options', updatedOptions);
      }
      
      // Avançar para o próximo passo
      setStep(2);
    } else if (step === 2) {
      // Verificar se todas as opções têm texto preenchido
      const options = watch('options');
      const emptyOptions = options.filter(option => !option.text || option.text.trim() === '');
      
      if (emptyOptions.length > 0) {
        // Mostrar mensagem de aviso usando o Toast
        setToastMessage('Por favor, preencha o texto de todas as opções antes de avançar.');
        setToastType('warning');
        setShowToast(true);
        return;
      }
      
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleCancel = (e: React.MouseEvent) => {
    // Prevenir comportamento padrão do formulário
    e.preventDefault();
    
    // Limpar o formulário antes de redirecionar
    setValue('text', '');
    setValue('categories', []);
    setValue('options', []);
    
    // Usar a função onCancel se fornecida, caso contrário redirecionar
    if (onCancel) {
      onCancel();
    } else {
      router.push('/admin/questions');
    }
  };

  const onSubmitForm = async (data: any) => {
    try {
      // Determinar o tipo de questão com base na URL atual, se não for fornecido explicitamente
      let questionTypeValue = questionType;
      
      if (!questionTypeValue && typeof window !== 'undefined') {
        const url = window.location.href;
        if (url.includes('/admin/training')) {
          questionTypeValue = 'training';
        } else if (url.includes('/admin/')) {
          questionTypeValue = 'selection';
        }
      }
      
      // Adicionar o tipo de questão aos dados
      if (questionTypeValue) {
        data.questionType = questionTypeValue;
      }
      
      // Formatar as opções para garantir que cada opção tenha a categoria correta
      const formattedOptions = data.options.map((option: any, index: number) => {
        const category = data.categories[index];
        console.log(`Formatando opção ${index + 1}, peso atual: ${option.weight}`);
        
        return {
          id: option.id, // Manter o ID original se estiver editando
          text: option.text,
          category: category?.name || '',
          categoryNameUuid: category?.uuid || option.categoryNameUuid,
          weight: option.weight !== undefined ? option.weight : calculateWeight(index, data.categories.length),
          position: index,
          isCorrect: true // Todas as opções em perguntas opinativas são "corretas"
        };
      });

      const formData = {
        ...data,
        type: 'OPINION_MULTIPLE',
        opinionGroupId: selectedGroup?.id,
        categoriesModified: categoriesModified,
        options: formattedOptions
      };
      
      // Se estamos criando um novo grupo, adicionar o UUID do grupo aos dados
      // e usar o UUID como nome do grupo
      if (isCreatingNewGroup && newGroupUuid) {
        formData.newGroupUuid = newGroupUuid;
        formData.opinionGroupName = newGroupUuid; // Usar o UUID como nome do grupo
      }
      
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Erro ao salvar pergunta opinativa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para verificar se uma categoria foi modificada
  const handleCategoryChange = (index: number, field: string, value: string) => {
    if (!selectedGroup) return;
    
    const category = watch(`categories.${index}`);
    const categoryUuid = category.uuid;
    
    if (categoryUuid && originalCategories[categoryUuid]) {
      // Comparar o valor original com o novo valor
      if (field === 'name' && originalCategories[categoryUuid] !== value) {
        console.log(`Categoria modificada: ${originalCategories[categoryUuid]} -> ${value}`);
        setCategoriesModified(true);
      }
    }
  };

  // Verificar se a quantidade de categorias mudou
  useEffect(() => {
    const categoriesLength = watch('categories').length;
    
    if (selectedGroup && originalCategoryCount > 0) {
      // Se a quantidade atual de categorias for diferente da original
      if (categoriesLength !== originalCategoryCount) {
        console.log(`Quantidade de categorias modificada: de ${originalCategoryCount} para ${categoriesLength}`);
        setCategoriesModified(true);
      }
    }
  }, [watch, selectedGroup, originalCategoryCount]);

  // Função para calcular o peso com base na posição e no total de opções
  const calculateWeight = (index: number, totalOptions: number) => {
    // Se tiver apenas uma opção, o peso é 5
    if (totalOptions === 1) return 5;
    
    // Se tiver mais de uma opção, calcular o peso baseado na posição
    // Primeira opção (index 0) tem peso 5, última opção tem peso 1
    // Usar valores decimais com uma casa decimal
    const weight = 5 - (4 * index / (totalOptions - 1));
    
    // Arredondar para uma casa decimal
    return Math.round(weight * 10) / 10;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Toast para mensagens de aviso */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast 
            message={toastMessage} 
            type={toastType} 
            onClose={() => setShowToast(false)} 
          />
        </div>
      )}
      
      {/* Indicador de progresso - Mais compacto e visualmente claro */}
      <div className="mb-4">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'} text-sm font-medium`}>
            1
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'} text-sm font-medium`}>
            2
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'} text-sm font-medium`}>
            3
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <div className="text-xs font-medium">CATEGORIAS</div>
          <div className="text-xs font-medium">PERGUNTA</div>
          <div className="text-xs font-medium">CONFIGURAÇÕES</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)}>
        {/* Etapa 1: Definir categorias de opinião - Layout mais compacto */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">CRIAR GRUPO DE TRAÇOS</h2>
            <p className="text-sm text-gray-600 mb-3">
              Defina os traços de personalidade para esta pergunta. Você pode criar um novo conjunto de traços ou usar um existente.
            </p>

            {/* Seleção de grupo existente ou criação de novo */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-all ${isCreatingNewGroup ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
                onClick={handleCreateNewGroup}
              >
                <h4 className="font-medium text-sm">CRIAR NOVO GRUPO DE TRAÇOS</h4>
                <p className="text-xs text-gray-600">Defina novos traços de personalidade para esta pergunta</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">USAR GRUPO EXISTENTE</h4>
                {hasLoadedGroupsRef.current ? (
                  <select 
                    className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                    onChange={(e) => handleSelectGroup(e.target.value)}
                    value={selectedGroup?.id || ''}
                  >
                    <option value="">Selecione um grupo</option>
                    {opinionGroups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>
            </div>

            {(selectedGroup || watch('categories').length > 0) && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">
                    {selectedGroup ? 'Categorias do grupo selecionado' : 'Defina suas categorias'}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {watch('categories').map((category, index) => (
                        <div key={category.uuid} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium">TRAÇO {index + 1}</h3>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCategory(index)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                X
                              </button>
                            )}
                          </div>
                          
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nome
                            </label>
                            <input
                              ref={index === 0 ? firstEmptyCategoryRef : null}
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              placeholder="Nome do traço"
                              value={category.name}
                              onChange={(e) => {
                                const newCategories = [...watch('categories')];
                                newCategories[index].name = e.target.value;
                                setValue('categories', newCategories);
                                handleCategoryChange(index, 'name', e.target.value);
                              }}
                            />
                            {errors.categories?.[index]?.name && (
                              <p className="text-red-500 text-xs mt-0.5">{errors.categories[index].name.message}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Descrição
                            </label>
                            <textarea 
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              rows={2}
                              placeholder="Descrição breve do traço..."
                              value={category.description}
                              onChange={(e) => {
                                const newCategories = [...watch('categories')];
                                newCategories[index].description = e.target.value;
                                setValue('categories', newCategories);
                                handleCategoryChange(index, 'description', e.target.value);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="mt-2 inline-flex items-center px-3 py-1.5 border border-primary-300 text-sm rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Adicionar Categoria
                    </button>
                  </div>
                </div>
              </div>
            )}

            {categoriesModified && selectedGroup && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-4">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">Atenção:</span> Você modificou uma ou mais categorias do grupo original. 
                  Ao salvar, um novo grupo de opinião será criado com essas alterações.
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              
              <Button
                variant="primary"
                onClick={handleNextStep}
                disabled={watch('categories').length === 0}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 2: Criar pergunta e opções - Layout mais compacto e organizado */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">CRIAR PERGUNTA E OPÇÕES</h2>
            <p className="text-sm text-gray-600 mb-3">
              Defina a pergunta e as opções de resposta para cada categoria.
            </p>

            <div className="space-y-3">
              {/* Pergunta */}
              <div className="p-3 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium mb-2">PERGUNTA</h3>
                
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Texto da Pergunta
                  </label>
                  <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    rows={2}
                    placeholder="Digite a pergunta aqui..."
                    value={watch('text')}
                    onChange={(e) => setValue('text', e.target.value)}
                  />
                  {errors.text && (
                    <p className="text-red-500 text-xs mt-0.5">{String(errors.text?.message || "Campo obrigatório")}</p>
                  )}
                </div>
              </div>

              {/* Opções de resposta */}
              <div>
                <h3 className="text-sm font-medium mb-2">OPÇÕES DE RESPOSTA</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Defina uma opção de resposta para cada categoria.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {watch('options').map((option, index) => {
                    const category = watch(`categories.${index}`);
                    // Cores diferentes para cada categoria
                    const categoryColors = [
                      'bg-blue-100 border-blue-300', 
                      'bg-green-100 border-green-300',
                      'bg-purple-100 border-purple-300',
                      'bg-yellow-100 border-yellow-300',
                      'bg-pink-100 border-pink-300',
                      'bg-indigo-100 border-indigo-300',
                      'bg-red-100 border-red-300',
                      'bg-orange-100 border-orange-300'
                    ];
                    const colorClass = categoryColors[index % categoryColors.length];
                    
                    return (
                      <div key={option.id} className={`p-3 border rounded-lg ${colorClass}`}>
                        <h4 className="font-medium text-sm mb-1 capitalize">
                          {category?.name || `CATEGORIA ${index + 1}`}
                        </h4>
                        
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Texto da Opção
                          </label>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            rows={2}
                            placeholder="Digite o texto da opção..."
                            value={option.text}
                            onChange={(e) => {
                              const newOptions = [...watch('options')];
                              newOptions[index].text = e.target.value;
                              setValue('options', newOptions);
                            }}
                          />
                          {errors.options?.[index]?.text && (
                            <p className="text-red-500 text-xs mt-0.5">{errors.options[index].text.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Peso (1-10)
                          </label>
                          <input 
                            type="number" 
                            min={1}
                            max={10}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            value={option.weight !== undefined ? option.weight : calculateWeight(index, watch('options').length)}
                            onChange={(e) => {
                              const newOptions = [...watch('options')];
                              newOptions[index].weight = parseInt(e.target.value);
                              setValue('options', newOptions);
                            }}
                          />
                          {errors.options?.[index]?.weight && (
                            <p className="text-red-500 text-xs mt-0.5">{errors.options[index].weight.message}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handlePrevStep}
              >
                Voltar
              </Button>
              <Button 
                type="button" 
                variant="primary"
                onClick={() => setStep(3)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 3: Configurações adicionais */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">CONFIGURAÇÕES ADICIONAIS</h2>
            <p className="text-sm text-gray-600 mb-3">
              Configure opções adicionais para a pergunta.
            </p>

            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium mb-2">CONFIGURAÇÕES</h3>
                
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Dificuldade
                  </label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={watch('difficulty')}
                    onChange={(e) => setValue('difficulty', e.target.value)}
                  >
                    <option value={QuestionDifficulty.EASY}>Fácil</option>
                    <option value={QuestionDifficulty.MEDIUM}>Média</option>
                    <option value={QuestionDifficulty.HARD}>Difícil</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Categoria do Sistema
                  </label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    value={watch('categoryId')}
                    onChange={(e) => setValue('categoryId', e.target.value)}
                  >
                    <option value="">Selecione uma categoria</option>
                    {systemCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={watch('showExplanation')}
                      onChange={(e) => setValue('showExplanation', e.target.checked)}
                    />
                    <span className="ml-2 text-xs font-medium text-gray-700">
                      Mostrar explicação inicial
                    </span>
                  </label>
                </div>

                {watch('showExplanation') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Explicação Inicial
                    </label>
                    <textarea 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      rows={3}
                      placeholder="Explicação que aparecerá antes da pergunta..."
                      value={watch('initialExplanation')}
                      onChange={(e) => setValue('initialExplanation', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setStep(2)}
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                    {isEditing ? 'Atualizando...' : 'Salvando...'}
                  </div>
                ) : (
                  isEditing ? 'Atualizar Pergunta' : 'Salvar Pergunta'
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default OpinionQuestionWizard;
