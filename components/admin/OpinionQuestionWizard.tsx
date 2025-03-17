import React, { useState, useEffect, useCallback } from 'react';
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
  isEditing = false
}) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [opinionGroups, setOpinionGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [originalCategories, setOriginalCategories] = useState<{[key: string]: string}>({});
  const [originalCategoryCount, setOriginalCategoryCount] = useState(0);
  const [categoriesModified, setCategoriesModified] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemCategories, setSystemCategories] = useState<SystemCategory[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('warning');

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
    // Carregar grupos de opinião
    const fetchOpinionGroups = async () => {
      try {
        const response = await fetch('/api/admin/opinion-groups');
        if (response.ok) {
          const data = await response.json();
          setOpinionGroups(data);
          setGroupsLoaded(true);
        } else {
          console.error('Erro ao carregar grupos de opinião');
        }
      } catch (error) {
        console.error('Erro ao buscar grupos de opinião:', error);
      }
    };

    // Carregar categorias do sistema
    const fetchSystemCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories');
        if (response.ok) {
          const data = await response.json();
          setSystemCategories(data);
        } else {
          console.error('Erro ao carregar categorias do sistema');
        }
      } catch (error) {
        console.error('Erro ao buscar categorias do sistema:', error);
      }
    };

    fetchOpinionGroups();
    fetchSystemCategories();
  }, []);

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
            id: opt.id,
            text: opt.text,
            categoryNameUuid: category?.uuid || generateUUID(),
            category: opt.category,
            weight: opt.weight || 1,
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

  useEffect(() => {
    if (groupsLoaded) return;
    
    const fetchOpinionGroups = async () => {
      if (!groupsLoaded) {
        try {
          const response = await fetch('/api/admin/opinion-groups', {
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            setOpinionGroups(data);
          }
        } catch (error) {
          console.error('Erro ao carregar grupos de opinião:', error);
        } finally {
          setGroupsLoaded(true);
        }
      }
    };

    fetchOpinionGroups();
  }, [groupsLoaded]);

  const handleCreateNewGroup = () => {
    // Limpar a seleção de grupo
    setSelectedGroup(null);
    
    // Limpar categorias e opções existentes usando setValue
    setValue('categories', []);
    setValue('options', []);
    
    // Adicionar uma categoria vazia
    setValue('categories', [{
      name: '',
      description: '',
      uuid: generateUUID()
    }]);
    
    // Adicionar uma opção vazia
    setValue('options', [{
      text: '',
      categoryNameUuid: generateUUID(),
      category: '',
      weight: 1,
      position: 0
    }]);
    
    // Resetar o flag de modificação
    setCategoriesModified(false);
    setOriginalCategories({});
    setOriginalCategoryCount(0);
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
          category: category.name,
          weight: 1,
          position: newOptions.length
        });
      });
      
      // Definir categorias e opções de uma vez
      setValue('categories', newCategories);
      setValue('options', newOptions);
      
      // Salvar as categorias originais para posterior comparação
      const origCats: {[key: string]: string} = {};
      group.categories.forEach(category => {
        if (category.uuid) {
          origCats[category.uuid] = category.name;
        }
      });
      setOriginalCategories(origCats);
      
      // Salvar a quantidade original de categorias
      setOriginalCategoryCount(group.categories.length);
      
      // Resetar o flag de modificação
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
      // Se as categorias foram modificadas, resetar a seleção de grupo
      if (categoriesModified) {
        setSelectedGroup(null);
      }
      
      // Verificar se o número de opções corresponde ao número de categorias
      const currentCategories = watch('categories');
      const currentOptions = watch('options');
      
      // Se o número de opções não corresponder ao número de categorias, ajustar
      if (currentOptions.length !== currentCategories.length) {
        console.log(`Ajustando opções: de ${currentOptions.length} para ${currentCategories.length} opções`);
        
        // Criar um novo array de opções em vez de manipular diretamente o optionFields
        const newOptions = [];
        
        // Adicionar uma opção para cada categoria
        currentCategories.forEach((category, index) => {
          newOptions.push({
            text: '',
            categoryNameUuid: category.uuid || generateUUID(),
            category: category.name,
            weight: 1,
            position: index
          });
        });
        
        // Definir todas as opções de uma vez
        setValue('options', newOptions);
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

  const onFormSubmit = async (data: any) => {
    // Formatar as opções para garantir que cada opção tenha a categoria correta
    const formattedOptions = data.options.map((option: any, index: number) => {
      const category = data.categories[index];
      return {
        id: option.id, // Manter o ID original se estiver editando
        text: option.text,
        category: category?.name || '',
        categoryNameUuid: category?.uuid || option.categoryNameUuid,
        weight: option.weight || 1,
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
    
    try {
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
    if (selectedGroup && originalCategoryCount > 0) {
      // Se a quantidade atual de categorias for diferente da original
      if (watch('categories').length !== originalCategoryCount) {
        console.log(`Quantidade de categorias modificada: de ${originalCategoryCount} para ${watch('categories').length}`);
        setCategoriesModified(true);
      }
    }
  }, [watch('categories').length, selectedGroup, originalCategoryCount]);

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

      <form onSubmit={handleSubmit(onFormSubmit)}>
        {/* Etapa 1: Definir categorias de opinião - Layout mais compacto */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">CRIAR CATEGORIAS</h2>
            <p className="text-sm text-gray-600 mb-3">
              Defina as categorias de personalidade para esta pergunta.
            </p>

            {/* Seleção de grupo existente ou criação de novo */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-all ${!selectedGroup ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
                onClick={handleCreateNewGroup}
              >
                <h4 className="font-medium text-sm">CRIAR NOVO GRUPO</h4>
                <p className="text-xs text-gray-600">Defina novas categorias para esta pergunta</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">USAR GRUPO EXISTENTE</h4>
                {groupsLoaded ? (
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
                            <h3 className="text-sm font-medium">CATEGORIA {index + 1}</h3>
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
                            <Controller
                              name={`categories.${index}.name`}
                              control={control}
                              rules={{ required: "Nome da categoria é obrigatório" }}
                              render={({ field }) => (
                                <input 
                                  {...field}
                                  type="text" 
                                  className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                                  placeholder="Ex: Introvertido, Extrovertido..."
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleCategoryChange(index, 'name', e.target.value);
                                  }}
                                />
                              )}
                            />
                            {errors.categories?.[index]?.name && (
                              <p className="text-red-500 text-xs mt-0.5">{errors.categories[index].name.message}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Descrição
                            </label>
                            <Controller
                              name={`categories.${index}.description`}
                              control={control}
                              render={({ field }) => (
                                <textarea 
                                  {...field}
                                  rows={2}
                                  className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                                  placeholder="Descrição breve da categoria..."
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleCategoryChange(index, 'description', e.target.value);
                                  }}
                                />
                              )}
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
                  <Controller
                    name="text"
                    control={control}
                    rules={{ required: "Texto da pergunta é obrigatório" }}
                    render={({ field }) => (
                      <textarea 
                        {...field}
                        rows={2}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                        placeholder="Digite a pergunta aqui..."
                      />
                    )}
                  />
                  {errors.text && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.text.message}</p>
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
                          <Controller
                            name={`options.${index}.text`}
                            control={control}
                            rules={{ required: "Texto da opção é obrigatório" }}
                            render={({ field }) => (
                              <textarea 
                                {...field}
                                rows={2}
                                className="w-full p-1.5 text-sm border border-gray-300 rounded-md bg-white"
                                placeholder="Digite o texto da opção..."
                              />
                            )}
                          />
                          {errors.options?.[index]?.text && (
                            <p className="text-red-500 text-xs mt-0.5">{errors.options[index].text.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Peso (1-10)
                          </label>
                          <Controller
                            name={`options.${index}.weight`}
                            control={control}
                            rules={{ 
                              required: "Peso é obrigatório",
                              min: { value: 1, message: "Peso mínimo é 1" },
                              max: { value: 10, message: "Peso máximo é 10" }
                            }}
                            render={({ field }) => (
                              <input 
                                {...field}
                                type="number" 
                                min={1}
                                max={10}
                                className="w-full p-1.5 text-sm border border-gray-300 rounded-md bg-white"
                              />
                            )}
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
                  <Controller
                    name="difficulty"
                    control={control}
                    render={({ field }) => (
                      <select 
                        {...field}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                      >
                        <option value={QuestionDifficulty.EASY}>Fácil</option>
                        <option value={QuestionDifficulty.MEDIUM}>Média</option>
                        <option value={QuestionDifficulty.HARD}>Difícil</option>
                      </select>
                    )}
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Categoria do Sistema
                  </label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <select 
                        {...field}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                      >
                        <option value="">Selecione uma categoria</option>
                        {systemCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div className="mb-3">
                  <label className="flex items-center">
                    <Controller
                      name="showExplanation"
                      control={control}
                      defaultValue={false}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
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
                    <Controller
                      name="initialExplanation"
                      control={control}
                      render={({ field }) => (
                        <textarea 
                          {...field}
                          rows={3}
                          className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                          placeholder="Explicação que aparecerá antes da pergunta..."
                        />
                      )}
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
