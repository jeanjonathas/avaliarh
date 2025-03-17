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
    <div className="w-full">
      {/* Indicador de progresso */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            1
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <div className="text-sm font-medium">Definir Categorias de Opinião</div>
          <div className="text-sm font-medium">Criar Pergunta e Opções</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        {/* Etapa 1: Definir categorias de opinião */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Definir Categorias de Opinião</h2>
            <p className="text-gray-600 mb-6">
              Nesta etapa, defina as categorias de opinião que serão usadas para classificar as respostas.
              Você pode criar um novo conjunto de categorias ou usar um grupo existente.
            </p>

            {/* Seleção de grupo existente ou criação de novo */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Escolha uma opção:</h3>
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div 
                  className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${!selectedGroup ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}`}
                  onClick={handleCreateNewGroup}
                >
                  <h4 className="font-medium">Criar Novo Grupo</h4>
                  <p className="text-sm text-gray-600">Defina novas categorias de opinião para esta pergunta</p>
                </div>
                
                <div className="flex-1">
                  <div className="p-4 border rounded-lg h-full">
                    <h4 className="font-medium mb-2">Usar Grupo Existente</h4>
                    {isLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                      </div>
                    ) : opinionGroups.length === 0 ? (
                      <p className="text-sm text-gray-600">Nenhum grupo existente encontrado</p>
                    ) : (
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md"
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
              </div>
            </div>

            {/* Lista de categorias */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Categorias de Opinião</h3>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleAddCategory}
                  className="text-sm"
                >
                  Adicionar Categoria
                </Button>
              </div>
              
              {categoryFields.length === 0 ? (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                  Nenhuma categoria definida. Crie uma nova ou selecione um grupo existente.
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryFields.map((field, index) => (
                    <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Categoria {index + 1}</h4>
                        {categoryFields.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCategory(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="Ex: Introvertido, Extrovertido, Analítico, etc."
                            />
                          )}
                        />
                        {errors.categories?.[index]?.name && (
                          <p className="text-red-500 text-sm mt-1">{errors.categories[index].name.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descrição (opcional)
                        </label>
                        <Controller
                          name={`categories.${index}.description`}
                          control={control}
                          render={({ field }) => (
                            <textarea 
                              {...field}
                              rows={2}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="Descreva esta categoria de opinião"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-200">
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

        {/* Etapa 2: Criar pergunta e opções */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Criar Pergunta e Opções</h2>
            <p className="text-gray-600 mb-6">
              Agora, defina o texto da pergunta, a explicação inicial (opcional) e as opções de resposta.
              Cada opção deve corresponder a uma das categorias de opinião definidas anteriormente.
            </p>

            {/* Texto da pergunta */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto da Pergunta
              </label>
              <Controller
                name="text"
                control={control}
                rules={{ required: "Texto da pergunta é obrigatório" }}
                render={({ field }) => (
                  <textarea 
                    {...field}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Digite o texto da pergunta"
                  />
                )}
              />
              {errors.text && (
                <p className="text-red-500 text-sm mt-1">{errors.text.message}</p>
              )}
            </div>

            {/* Explicação inicial */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Explicação Inicial (opcional)
              </label>
              <Controller
                name="initialExplanation"
                control={control}
                render={({ field }) => (
                  <textarea 
                    {...field}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Explicação que será mostrada antes das opções"
                  />
                )}
              />
            </div>

            {/* Nível de dificuldade */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de Dificuldade
              </label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <select 
                    {...field}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value={QuestionDifficulty.EASY}>Fácil</option>
                    <option value={QuestionDifficulty.MEDIUM}>Médio</option>
                    <option value={QuestionDifficulty.HARD}>Difícil</option>
                  </select>
                )}
              />
            </div>

            {/* Opções */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Opções de Resposta</h3>
              <p className="text-gray-600 mb-4">
                Defina o texto para cada opção de resposta. Cada opção corresponde a uma categoria de opinião.
              </p>
              
              {optionFields.map((field, index) => {
                const category = watch(`categories.${index}`);
                return (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">
                      Opção para categoria: <span className="text-primary-600">{category?.name || `Categoria ${index + 1}`}</span>
                    </h4>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder={`Texto para a opção que representa ${category?.name || `Categoria ${index + 1}`}`}
                          />
                        )}
                      />
                      {errors.options?.[index]?.text && (
                        <p className="text-red-500 text-sm mt-1">{errors.options[index].text.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            min="1"
                            max="10"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Peso da opção (1-10)"
                          />
                        )}
                      />
                      {errors.options?.[index]?.weight && (
                        <p className="text-red-500 text-sm mt-1">{errors.options[index].weight.message}</p>
                      )}
                    </div>

                    <Controller
                      name={`options.${index}.categoryId`}
                      control={control}
                      render={({ field }) => (
                        <input type="hidden" {...field} value={category?.id || `temp-${index}`} />
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handlePrevStep}
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                variant="primary"
              >
                Criar Pergunta
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default OpinionQuestionWizard;
