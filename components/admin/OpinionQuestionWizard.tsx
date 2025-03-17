import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Button } from '../ui/Button';
import { QuestionDifficulty, QuestionType } from '../../types/questions';

interface OpinionGroup {
  id: string;
  name: string;
  categories: {
    id: string;
    name: string;
    description?: string;
  }[];
}

interface OpinionQuestionWizardProps {
  onSubmit: (data: any) => void;
  initialData?: any;
}

const OpinionQuestionWizard: React.FC<OpinionQuestionWizardProps> = ({ onSubmit, initialData }) => {
  const [step, setStep] = useState(1);
  const [opinionGroups, setOpinionGroups] = useState<OpinionGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OpinionGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false); 
  const router = useRouter();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      type: QuestionType.OPINION_MULTIPLE,
      text: '',
      difficulty: QuestionDifficulty.MEDIUM,
      categories: [],
      options: [],
      initialExplanation: '',
      showExplanation: false
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
      try {
        setIsLoading(true);
        console.log('Carregando grupos de opiniões...');
        const response = await fetch('/api/admin/opinion-groups');
        if (response.ok) {
          const data = await response.json();
          console.log(`Carregados ${data.length} grupos de opiniões`);
          setOpinionGroups(data);
          setGroupsLoaded(true); 
        } else {
          console.error('Erro ao carregar grupos de opiniões:', response.statusText);
        }
      } catch (error) {
        console.error('Erro ao carregar grupos de opiniões:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpinionGroups();
  }, [groupsLoaded]); 

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
        description: category.description || ''
      });
    });

    const currentOptions = watch('options');
    if (currentOptions.length === 0 || currentOptions.length !== selectedGroup.categories.length) {
      while (optionFields.length > 0) {
        removeOption(0);
      }

      selectedGroup.categories.forEach(() => {
        appendOption({
          text: '',
          categoryId: '',
          weight: 1
        });
      });
    }
  }, [selectedGroup]); 

  const handleCreateNewGroup = () => {
    setSelectedGroup(null);
    
    while (categoryFields.length > 0) {
      removeCategory(0);
    }
    
    appendCategory({
      name: '',
      description: ''
    });
    
    while (optionFields.length > 0) {
      removeOption(0);
    }
    
    appendOption({
      text: '',
      categoryId: '',
      weight: 1
    });
  };

  const handleAddCategory = () => {
    appendCategory({
      name: '',
      description: ''
    });
    
    appendOption({
      text: '',
      categoryId: '',
      weight: 1
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
      <div className="mb-6">
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
          <div className="text-xs font-medium">Categorias</div>
          <div className="text-xs font-medium">Pergunta</div>
          <div className="text-xs font-medium">Configurações</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        {/* Etapa 1: Definir categorias de opinião - Layout mais compacto */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Definir Categorias de Opinião</h2>
            <p className="text-sm text-gray-600 mb-4">
              Defina as categorias de opinião para classificar as respostas.
            </p>

            {/* Seleção de grupo existente ou criação de novo - Layout em cards mais compactos */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-all ${!selectedGroup ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
                onClick={handleCreateNewGroup}
              >
                <h4 className="font-medium text-sm">Criar Novo Grupo</h4>
                <p className="text-xs text-gray-600">Defina novas categorias para esta pergunta</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">Usar Grupo Existente</h4>
                {isLoading ? (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                ) : opinionGroups.length === 0 ? (
                  <p className="text-xs text-gray-600">Nenhum grupo existente encontrado</p>
                ) : (
                  <select 
                    className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                    onChange={(e) => {
                      const groupId = e.target.value;
                      if (groupId) {
                        const group = opinionGroups.find(g => g.id === groupId);
                        if (group) {
                          setSelectedGroup(group);
                        }
                      } else {
                        setSelectedGroup(null);
                      }
                    }}
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

            {/* Lista de categorias - Layout mais compacto e eficiente */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Categorias de Opinião</h3>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleAddCategory}
                  className="text-xs py-1 px-2"
                >
                  + Adicionar
                </Button>
              </div>
              
              {categoryFields.length === 0 ? (
                <div className="p-3 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                  Nenhuma categoria definida. Crie uma nova ou selecione um grupo existente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryFields.map((field, index) => (
                    <div key={field.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-sm">Categoria {index + 1}</h4>
                        {categoryFields.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCategory(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nome da Categoria
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
                          Descrição (opcional)
                        </label>
                        <Controller
                          name={`categories.${index}.description`}
                          control={control}
                          render={({ field }) => (
                            <textarea 
                              {...field}
                              rows={1}
                              className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                              placeholder="Descrição breve"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleCancel}
              >
                Cancelar
              </Button>
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
            <h2 className="text-lg font-semibold mb-2">Criar Pergunta e Opções</h2>
            <p className="text-sm text-gray-600 mb-4">
              Defina a pergunta e as opções de resposta para cada categoria.
            </p>

            <div className="space-y-4">
              {/* Pergunta */}
              <div className="p-3 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Pergunta</h3>
                
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
                <h3 className="text-sm font-medium mb-2">Opções de Resposta</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Defina uma opção de resposta para cada categoria.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {optionFields.map((field, index) => {
                    const category = watch(`categories.${index}`);
                    return (
                      <div key={field.id} className="p-3 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-sm mb-1">
                          Opção para: {category?.name || `Categoria ${index + 1}`}
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
                                className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
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
                                className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
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
            <h2 className="text-lg font-semibold mb-2">Configurações Adicionais</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure opções adicionais para a pergunta.
            </p>

            <div className="space-y-4">
              <div className="p-3 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Configurações</h3>
                
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
