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

  // Carregar grupos de opiniões existentes
  useEffect(() => {
    const fetchOpinionGroups = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/opinion-groups');
        if (response.ok) {
          const data = await response.json();
          setOpinionGroups(data);
        }
      } catch (error) {
        console.error('Erro ao carregar grupos de opiniões:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpinionGroups();
  }, []);

  // Quando selecionar um grupo existente, preencher as categorias
  useEffect(() => {
    if (selectedGroup) {
      // Limpar categorias atuais
      while (categoryFields.length > 0) {
        removeCategory(0);
      }

      // Adicionar categorias do grupo selecionado
      selectedGroup.categories.forEach(category => {
        appendCategory({
          id: category.id,
          name: category.name,
          description: category.description || ''
        });
      });

      // Atualizar opções para corresponder às categorias
      const currentOptions = watch('options');
      if (currentOptions.length === 0 || currentOptions.length !== selectedGroup.categories.length) {
        // Limpar opções atuais
        while (optionFields.length > 0) {
          removeOption(0);
        }

        // Adicionar opções vazias para cada categoria
        selectedGroup.categories.forEach(() => {
          appendOption({
            text: '',
            categoryId: '',
            weight: 1
          });
        });
      }
    }
  }, [selectedGroup, appendCategory, removeCategory, appendOption, removeOption, categoryFields.length, optionFields.length, watch]);

  const handleCreateNewGroup = () => {
    setSelectedGroup(null);
    
    // Limpar categorias atuais
    while (categoryFields.length > 0) {
      removeCategory(0);
    }
    
    // Adicionar uma categoria vazia para começar
    appendCategory({
      name: '',
      description: ''
    });
    
    // Limpar opções atuais
    while (optionFields.length > 0) {
      removeOption(0);
    }
    
    // Adicionar uma opção vazia
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
    
    // Adicionar uma opção correspondente
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
    // Atualizar os categoryId nas opções para corresponder às categorias
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
    // Garantir que cada opção tenha um categoryId
    data.options.forEach((option: any, index: number) => {
      if (!option.categoryId && data.categories[index]) {
        option.categoryId = data.categories[index].id || `temp-${index}`;
      }
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
          <span className="text-sm font-medium">Definir Categorias</span>
          <span className="text-sm font-medium">Criar Pergunta e Opções</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        {/* Etapa 1: Definir categorias */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Etapa 1: Definir Categorias de Opinião</h2>
            
            {/* Seleção de grupo existente ou criação de novo */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Grupos de Opinião Existentes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Selecione um grupo existente ou crie um novo. Grupos são reutilizáveis em várias perguntas.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {isLoading ? (
                  <div className="col-span-2 flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                ) : opinionGroups.length > 0 ? (
                  <>
                    {opinionGroups.map(group => (
                      <div 
                        key={group.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedGroup?.id === group.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                        }`}
                        onClick={() => setSelectedGroup(group)}
                      >
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{group.categories.length} categorias</p>
                        <div className="mt-2">
                          {group.categories.map(category => (
                            <span key={category.id} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                              {category.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="col-span-2 text-gray-500 italic">Nenhum grupo de opinião encontrado.</p>
                )}
              </div>
              
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateNewGroup}
                className="mt-2"
              >
                Criar Novo Grupo de Opinião
              </Button>
            </div>
            
            {/* Editor de categorias */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">
                {selectedGroup ? `Editando Grupo: ${selectedGroup.name}` : 'Novo Grupo de Opinião'}
              </h3>
              
              {!selectedGroup && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Grupo
                  </label>
                  <Controller
                    name="groupName"
                    control={control}
                    defaultValue=""
                    rules={{ required: "Nome do grupo é obrigatório" }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Ex: Perfil de Liderança, Tipos de Personalidade, etc."
                      />
                    )}
                  />
                  {errors.groupName && (
                    <p className="mt-1 text-sm text-red-600">{errors.groupName.message as string}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                {categoryFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Categoria {index + 1}</h4>
                      {categoryFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome da Categoria
                        </label>
                        <Controller
                          name={`categories.${index}.name`}
                          control={control}
                          defaultValue=""
                          rules={{ required: "Nome da categoria é obrigatório" }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Ex: Líder Democrático, Introvertido, etc."
                            />
                          )}
                        />
                        {errors.categories?.[index]?.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.categories[index]?.name?.message as string}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descrição (opcional)
                        </label>
                        <Controller
                          name={`categories.${index}.description`}
                          control={control}
                          defaultValue=""
                          render={({ field }) => (
                            <textarea
                              {...field}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Descreva esta categoria..."
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddCategory}
                  className="w-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Adicionar Categoria
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button
                type="button"
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
            <h2 className="text-xl font-semibold mb-4">Etapa 2: Criar Pergunta e Opções</h2>
            
            <div className="space-y-6">
              {/* Campos da pergunta */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto da Pergunta
                  </label>
                  <Controller
                    name="text"
                    control={control}
                    defaultValue=""
                    rules={{ required: "Texto da pergunta é obrigatório" }}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Digite a pergunta aqui..."
                      />
                    )}
                  />
                  {errors.text && (
                    <p className="mt-1 text-sm text-red-600">{errors.text.message as string}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explicação Inicial (opcional)
                  </label>
                  <Controller
                    name="initialExplanation"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Explicação que será mostrada antes das opções..."
                      />
                    )}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dificuldade
                  </label>
                  <Controller
                    name="difficulty"
                    control={control}
                    defaultValue={QuestionDifficulty.MEDIUM}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value={QuestionDifficulty.EASY}>Fácil</option>
                        <option value={QuestionDifficulty.MEDIUM}>Média</option>
                        <option value={QuestionDifficulty.HARD}>Difícil</option>
                      </select>
                    )}
                  />
                </div>
              </div>
              
              {/* Opções da pergunta */}
              <div>
                <h3 className="text-lg font-medium mb-2">Opções da Pergunta</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Para cada categoria, defina o texto da opção correspondente.
                </p>
                
                <div className="space-y-4">
                  {optionFields.map((field, index) => {
                    const category = watch(`categories.${index}`);
                    
                    return (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1 bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium text-gray-800">{category?.name || `Categoria ${index + 1}`}</h4>
                            {category?.description && (
                              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                            )}
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Texto da Opção
                            </label>
                            <Controller
                              name={`options.${index}.text`}
                              control={control}
                              defaultValue=""
                              rules={{ required: "Texto da opção é obrigatório" }}
                              render={({ field }) => (
                                <textarea
                                  {...field}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  placeholder={`Digite o texto para a opção "${category?.name || `Categoria ${index + 1}`}"...`}
                                />
                              )}
                            />
                            {errors.options?.[index]?.text && (
                              <p className="mt-1 text-sm text-red-600">{errors.options[index]?.text?.message as string}</p>
                            )}
                            
                            {/* Campo oculto para o categoryId */}
                            <Controller
                              name={`options.${index}.categoryId`}
                              control={control}
                              defaultValue={category?.id || `temp-${index}`}
                              render={({ field }) => (
                                <input type="hidden" {...field} />
                              )}
                            />
                            
                            {/* Campo oculto para o peso (padrão: 1) */}
                            <Controller
                              name={`options.${index}.weight`}
                              control={control}
                              defaultValue={1}
                              render={({ field }) => (
                                <input type="hidden" {...field} />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevStep}
              >
                Voltar
              </Button>
              <Button
                type="submit"
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
