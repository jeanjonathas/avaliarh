import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
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

interface OpinionQuestionWizardProps {
  onSubmit: (data: any) => void;
  initialData?: any;
}

interface SystemCategory {
  id: string;
  name: string;
}

const OpinionQuestionWizard: React.FC<OpinionQuestionWizardProps> = ({ onSubmit, initialData }) => {
  const [step, setStep] = useState(1);
  const [opinionGroups, setOpinionGroups] = useState<OpinionGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OpinionGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false); 
  const [systemCategories, setSystemCategories] = useState<SystemCategory[]>([]);
  const router = useRouter();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      type: QuestionType.OPINION_MULTIPLE,
      text: '',
      difficulty: QuestionDifficulty.MEDIUM,
      categories: [],
      options: [],
      initialExplanation: '',
      showExplanation: false,
      categoryId: ''
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
    if (groupsLoaded) return;
    
    const fetchOpinionGroups = async () => {
      if (!groupsLoaded) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/admin/opinion-groups');
          if (response.ok) {
            const data = await response.json();
            setOpinionGroups(data);
          }
        } catch (error) {
          console.error('Erro ao carregar grupos de opinião:', error);
        } finally {
          setIsLoading(false);
          setGroupsLoaded(true);
        }
      }
    };

    fetchOpinionGroups();
  }, [groupsLoaded]);

  const handleCreateNewGroup = () => {
    setSelectedGroup(null);
    
    // Limpar categorias existentes
    setValue('categories', []);
    setValue('options', []);
    
    // Adicionar uma categoria vazia
    appendCategory({
      name: '',
      description: '',
      uuid: generateUUID()
    });
    
    const categoryUuid = generateUUID();
    appendOption({
      text: '',
      categoryNameUuid: categoryUuid,
      category: '',
      weight: 1,
      position: optionFields.length
    });
  };

  const handleSelectGroup = (groupId: string) => {
    const group = opinionGroups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      
      // Preencher categorias do grupo selecionado
      setValue('categories', group.categories);
      
      // Criar opções vazias para cada categoria
      const newOptions = group.categories.map(category => ({
        text: '',
        categoryNameUuid: category.uuid || generateUUID(),
        category: category.name,
        weight: 5,
        position: 0
      }));
      setValue('options', newOptions);
    }
  };

  useEffect(() => {
    if (initialData && initialData.categories && initialData.categories.length > 0) {
      console.log('Inicializando com dados iniciais:', initialData);
      
      // Se temos categorias nos dados iniciais, não precisamos selecionar um grupo
      // As categorias já estão definidas
      setStep(2); // Avançar para o próximo passo automaticamente
    }
  }, [initialData]);

  useEffect(() => {
    if (!selectedGroup) return;
    
    console.log(`Aplicando grupo selecionado: ${selectedGroup.name}`);
    
    while (categoryFields.length > 0) {
      removeCategory(0);
    }

    selectedGroup.categories.forEach(category => {
      appendCategory({
        id: category.id,
        name: category.name,
        description: category.description || '',
        uuid: category.uuid || generateUUID()
      });
    });

    const currentOptions = watch('options');
    if (currentOptions.length === 0 || currentOptions.length !== selectedGroup.categories.length) {
      while (optionFields.length > 0) {
        removeOption(0);
      }

      selectedGroup.categories.forEach((category, index) => {
        appendOption({
          text: '',
          categoryNameUuid: category.uuid || generateUUID(),
          category: category.name,
          weight: 1,
          position: index
        });
      });
    }
  }, [selectedGroup]); 

  useEffect(() => {
    const fetchSystemCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories');
        if (response.ok) {
          const data = await response.json();
          setSystemCategories(data);
        }
      } catch (error) {
        console.error('Erro ao carregar categorias do sistema:', error);
      }
    };

    fetchSystemCategories();
  }, []);

  const handleAddCategory = () => {
    const categoryUuid = generateUUID();
    appendCategory({
      name: '',
      description: '',
      uuid: categoryUuid
    });
    
    appendOption({
      text: '',
      categoryNameUuid: categoryUuid,
      category: '',
      weight: 1,
      position: optionFields.length
    });
  };

  const handleRemoveCategory = (index: number) => {
    removeCategory(index);
    removeOption(index);
  };

  const handleNextStep = () => {
    const categories = watch('categories');
    const options = watch('options');
    
    options.forEach((option, index) => {
      if (categories[index]) {
        setValue(`options.${index}.categoryId`, categories[index].id || `temp-${index}`);
      }
    });
    
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleCancel = () => {
    router.push('/admin/questions');
  };

  const onFormSubmit = (data: any) => {
    data.options.forEach((option: any, index: number) => {
      if (!option.categoryId && data.categories[index]) {
        option.categoryId = data.categories[index].id || `temp-${index}`;
      }
      
      option.isCorrect = true;
    });
    
    onSubmit({
      ...data,
      type: QuestionType.OPINION_MULTIPLE
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
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
                {isLoading ? (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                ) : opinionGroups.length === 0 ? (
                  <p className="text-xs text-gray-600">Nenhum grupo existente encontrado</p>
                ) : (
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
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryFields.map((field, index) => (
                  <div key={field.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium">CATEGORIA {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        X
                      </button>
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
                          />
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={handleAddCategory}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg> Adicionar Categoria
                </Button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button 
                type="button" 
                variant="primary"
                onClick={handleNextStep}
                disabled={categoryFields.length === 0}
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
                  {optionFields.map((field, index) => {
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
                      <div key={field.id} className={`p-3 border rounded-lg ${colorClass}`}>
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
              >
                Salvar Pergunta
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default OpinionQuestionWizard;
