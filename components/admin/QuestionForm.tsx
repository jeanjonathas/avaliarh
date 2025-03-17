import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray, FormikConsumer, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

// Enum para tipos de pergunta
enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',  // Questão com resposta correta
  OPINION_MULTIPLE = 'OPINION_MULTIPLE' // Questão opinativa categorizada
}

// Enum para níveis de dificuldade
enum DifficultyLevel {
  EASY = 'EASY',      // Questão simples
  MEDIUM = 'MEDIUM',  // Questão moderada
  HARD = 'HARD'       // Questão complexa
}

interface Stage {
  id: string;
  title: string;
  order?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
  weight?: number;  // Peso para questões opinativas
  category?: string; // Categoria para questões opinativas
}

interface Question {
  id?: string;
  text: string;
  stageId: string;
  categoryId?: string;
  categoryUuid?: string;
  options: Option[];
  type: QuestionType;
  difficulty: DifficultyLevel;
  showResults?: boolean;
  initialExplanation?: string; // Explicação inicial para questões opinativas
  category?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface QuestionFormProps {
  stages: Stage[];
  categories: Category[];
  onSubmit: (values: any, formikHelpers?: any) => Promise<void>;
  onCancel?: () => void;
  initialValues?: Question;
  isEditing?: boolean;
  preSelectedStageId?: string;
  preSelectedCategoryId?: string;
  onSuccess?: () => void;
  hideStageField?: boolean;
  isUpdating?: boolean;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  stages,
  categories,
  onSubmit,
  onCancel,
  initialValues,
  isEditing = false,
  preSelectedStageId,
  preSelectedCategoryId,
  onSuccess,
  hideStageField = false,
  isUpdating = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    preSelectedCategoryId || null
  );
  const notify = useNotificationSystem();

  // Debug das props recebidas
  useEffect(() => {
    if (initialValues) {
      console.log('DEBUG - QuestionForm recebeu initialValues:', initialValues);
      console.log('DEBUG - categoryId recebido:', initialValues.categoryId);
      console.log('DEBUG - categoryUuid recebido:', initialValues.categoryUuid);
      console.log('DEBUG - categorias disponíveis:', categories.map(c => ({ id: c.id, name: c.name })));
    }
  }, [initialValues, categories]);

  // Efeito para depurar e verificar quando os valores iniciais são recebidos
  useEffect(() => {
    if (initialValues) {
      console.log('DEBUG - VALORES INICIAIS RECEBIDOS:', {
        categoryId: initialValues.categoryId,
        categoryUuid: initialValues.categoryUuid,
        'category?.id': initialValues.category?.id
      });
    }
  }, [initialValues]);

  // Efeito para inicializar corretamente o categoryId quando os valores iniciais mudam
  useEffect(() => {
    console.log('Valores iniciais mudaram:', initialValues);
    
    // Defina o categoryId diretamente do valor inicial ou do valor da categoria aninhada
    if (initialValues && initialValues.categoryId) {
      console.log('Definindo selectedCategoryId para:', initialValues.categoryId);
      setSelectedCategoryId(initialValues.categoryId);
    }
  }, [initialValues]);

  // Synchronize categoryId with categoryUuid when component mounts
  useEffect(() => {
    if (initialValues?.categoryUuid && categories.length > 0) {
      const matchingCategory = categories.find(cat => cat.id === initialValues.categoryUuid);
      if (matchingCategory) {
        console.log('Categoria encontrada pelo UUID:', matchingCategory.name);
        setSelectedCategoryId(matchingCategory.id);
      }
    }
  }, [initialValues, categories]);

  const defaultValues = {
    text: '',
    stageId: preSelectedStageId || (stages.length > 0 ? stages[0].id : null),
    categoryId: '',
    categoryUuid: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    type: QuestionType.MULTIPLE_CHOICE,
    difficulty: DifficultyLevel.EASY,
  };

  // Prepare initial values for Formik form
  const prepareInitialValues = () => {
    console.log('Preparando valores iniciais para o formulário. Valores recebidos:', initialValues);
    
    // Verificar se há categoria quando estamos editando
    if (isEditing && initialValues) {
      // Garantir consistência entre categoryId e categoryUuid
      if (initialValues.categoryUuid && (!initialValues.categoryId || initialValues.categoryId === '')) {
        console.log('Definindo categoryId a partir de categoryUuid:', initialValues.categoryUuid);
        initialValues.categoryId = initialValues.categoryUuid;
      } else if (initialValues.categoryId && (!initialValues.categoryUuid || initialValues.categoryUuid === '')) {
        console.log('Definindo categoryUuid a partir de categoryId:', initialValues.categoryId);
        initialValues.categoryUuid = initialValues.categoryId;
      }
      
      // Se temos o objeto category, garantir que as propriedades estejam atualizadas
      if (initialValues.category) {
        console.log('Categoria encontrada nos valores iniciais:', initialValues.category);
        initialValues.categoryId = initialValues.category.id;
        initialValues.categoryUuid = initialValues.category.id;
      }
    }
    
    // Garantir que stageId tenha um valor válido quando o campo está oculto
    let defaultStageId = '';
    if (preSelectedStageId) {
      defaultStageId = preSelectedStageId;
    } else if (stages.length > 0) {
      defaultStageId = stages[0].id;
    }
    
    // Se não houver opções, criar duas opções vazias por padrão
    if (!initialValues?.options || initialValues.options.length === 0) {
      return {
        text: initialValues?.text || '',
        stageId: initialValues?.stageId || defaultStageId,
        categoryId: initialValues?.categoryId || (preSelectedCategoryId || ''),
        categoryUuid: initialValues?.categoryUuid || (preSelectedCategoryId || ''),
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ],
        type: initialValues?.type || QuestionType.MULTIPLE_CHOICE,
        difficulty: initialValues?.difficulty || DifficultyLevel.EASY,
      };
    }

    // Retornar valores existentes
    return {
      text: initialValues?.text || '',
      stageId: initialValues?.stageId || defaultStageId,
      categoryId: initialValues?.categoryId || (preSelectedCategoryId || ''),
      categoryUuid: initialValues?.categoryUuid || (preSelectedCategoryId || ''),
      options: initialValues?.options || [],
      type: initialValues?.type || QuestionType.MULTIPLE_CHOICE,
      difficulty: initialValues?.difficulty || DifficultyLevel.EASY,
    };
  };

  const getValidationSchema = () => {
    const baseSchema = {
      text: Yup.string().required('Texto da pergunta é obrigatório'),
      options: Yup.array()
        .of(
          Yup.object().shape({
            text: Yup.string().required('Texto da opção é obrigatório'),
            isCorrect: Yup.boolean(),
          })
        )
        .min(2, 'Pelo menos duas opções são necessárias')
        .test('one-correct', 'Pelo menos uma opção deve ser marcada como correta', (options) => {
          return options.some((option) => option.isCorrect);
        }),
      type: Yup.string().oneOf([QuestionType.MULTIPLE_CHOICE, QuestionType.OPINION_MULTIPLE], 'Tipo de pergunta inválido'),
      difficulty: Yup.string().oneOf([DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD], 'Nível de dificuldade inválido'),
    };

    // Incluir stageId na validação apenas se o campo não estiver oculto
    if (!hideStageField) {
      return Yup.object({
        ...baseSchema,
        stageId: Yup.string().required('Etapa é obrigatória'),
      });
    }

    // Se o campo estiver oculto, não validar stageId
    return Yup.object(baseSchema);
  };

  const handleSubmit = async (values: any, { resetForm, setSubmitting }: any) => {
    try {
      console.log('QuestionForm.handleSubmit chamado com valores:', values);
      setError('');
      setSuccess('');
      setLoading(true);

      // Validações específicas para cada tipo de pergunta
      if (values.type === QuestionType.MULTIPLE_CHOICE) {
        // Verificar se há pelo menos uma opção correta
        const hasCorrectOption = values.options.some((option: any) => option.isCorrect);
        if (!hasCorrectOption) {
          setError('Pelo menos uma opção deve ser marcada como correta');
          notify.showError('Pelo menos uma opção deve ser marcada como correta');
          setSubmitting(false);
          setLoading(false);
          return;
        }
      } else if (values.type === QuestionType.OPINION_MULTIPLE) {
        // Para perguntas opinativas, verificar se todas as opções têm categoria e peso
        const hasIncompleteOption = values.options.some(
          (option: any) => !option.text.trim() || !option.category?.trim()
        );
        
        if (hasIncompleteOption) {
          setError('Todas as opções devem ter texto e categoria/opinião preenchidos');
          notify.showError('Todas as opções devem ter texto e categoria/opinião preenchidos');
          setSubmitting(false);
          setLoading(false);
          return;
        }
        
        // Definir todas as opções como "corretas" para perguntas opinativas
        values.options = values.options.map((option: any) => ({
          ...option,
          isCorrect: true
        }));
      }

      // Verificar se há texto em todas as opções
      const hasEmptyOption = values.options.some((option: any) => !option.text.trim());
      if (hasEmptyOption) {
        setError('Todas as opções devem ter um texto');
        notify.showError('Todas as opções devem ter um texto');
        setSubmitting(false);
        setLoading(false);
        return;
      }

      // Verificar se a etapa foi selecionada (quando o campo não está oculto)
      if (!hideStageField && !values.stageId) {
        setError('Selecione uma etapa');
        notify.showError('Selecione uma etapa');
        setSubmitting(false);
        setLoading(false);
        return;
      }

      // Chamar a função onSubmit passada como prop
      if (onSubmit) {
        await onSubmit(values, { resetForm, setSubmitting });
        
        // Exibir mensagem de sucesso
        if (onSuccess) {
          onSuccess();
        } else {
          setSuccess(isEditing ? 'Pergunta atualizada com sucesso!' : 'Pergunta adicionada com sucesso!');
          notify.showSuccess(isEditing ? 'Pergunta atualizada com sucesso!' : 'Pergunta adicionada com sucesso!');
        }
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao ${isEditing ? 'atualizar' : 'adicionar'} pergunta: ${errorMessage}`);
      notify.showError(`Erro ao ${isEditing ? 'atualizar' : 'adicionar'} pergunta: ${errorMessage}`);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-secondary-800 mb-6">
        {isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
        {error}
      </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
        {success}
      </div>
      )}

      <Formik
        initialValues={prepareInitialValues()}
        validationSchema={getValidationSchema()}
        enableReinitialize={true}  // Sempre permitir reinicialização para carregar valores iniciais
        onSubmit={(values, formikHelpers: FormikHelpers<any>) => {
          console.log('Formulário enviado com valores:', values);
          console.log('FormikHelpers disponível:', formikHelpers);
          handleSubmit(values, formikHelpers);
        }}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue, submitForm }) => (
          <Form>
            <div className="mb-4">
              <label htmlFor="text" className="block text-sm font-medium text-secondary-700 mb-1">
                Pergunta
              </label>
              <Field
                as="textarea"
                id="text"
                name="text"
                rows={3}
                className="input-field"
                placeholder="Digite o texto da pergunta"
              />
              <ErrorMessage
                name="text"
                render={msg => {
                  return typeof msg === 'string' 
                    ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                    : <div className="text-red-500 text-sm mt-1">Erro de validação na pergunta</div>
                }}
              />
            </div>
            
            {/* Campo oculto para stageId quando hideStageField é true */}
            {hideStageField && (
              <Field 
                type="hidden" 
                name="stageId" 
                value={preSelectedStageId || (stages.length > 0 ? stages[0].id : '')} 
              />
            )}
            
            {!hideStageField && (
              <div>
                <label htmlFor="stageId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Etapa
                </label>
                <Field
                  as="select"
                  name="stageId"
                  id="stageId"
                  className="input-field"
                  disabled={!!preSelectedStageId}
                >
                  {stages.length === 0 ? (
                    <option value="">Nenhuma etapa disponível</option>
                  ) : (
                    stages
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.title} {stage.order !== undefined && `(Etapa ${stage.order})`}
                        </option>
                      ))
                  )}
                </Field>
                <ErrorMessage
                  name="stageId"
                  render={msg => {
                    return typeof msg === 'string' 
                      ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                      : <div className="text-red-500 text-sm mt-1">Erro de validação na etapa</div>
                  }}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-secondary-700 mb-1">
                Categoria
              </label>
              <Field
                as="select"
                name="categoryId"
                id="categoryId"
                className="input-field"
                disabled={!!preSelectedCategoryId}
                value={values.categoryId || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const categoryId = e.target.value;
                  setFieldValue('categoryId', categoryId);
                  
                  // Encontrar o UUID correspondente à categoria selecionada
                  if (categoryId) {
                    const selectedCategory = categories.find(cat => cat.id === categoryId);
                    if (selectedCategory) {
                      console.log('Categoria selecionada no dropdown:', selectedCategory.name);
                      // Importante: definir o UUID para uso no backend
                      setFieldValue('categoryUuid', selectedCategory.id);
                      setSelectedCategoryId(selectedCategory.id);
                    } else {
                      console.log('Categoria não encontrada com ID:', categoryId);
                      setFieldValue('categoryUuid', '');
                      setSelectedCategoryId(null);
                    }
                  } else {
                    console.log('Nenhuma categoria selecionada no dropdown');
                    setFieldValue('categoryUuid', '');
                    setSelectedCategoryId(null);
                  }
                }}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option 
                    key={category.id} 
                    value={category.id}
                    data-uuid={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </Field>
              
              {/* Campo oculto para armazenar o UUID da categoria */}
              <Field type="hidden" name="categoryUuid" />              
              <ErrorMessage
                name="categoryId"
                render={msg => {
                  return typeof msg === 'string' 
                    ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                    : <div className="text-red-500 text-sm mt-1">Erro de validação na categoria</div>
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Tipo de Pergunta
              </label>
              <Field
                as="select"
                name="type"
                id="type"
                className="input-field"
              >
                <option value={QuestionType.MULTIPLE_CHOICE}>Questão com resposta correta</option>
                <option value={QuestionType.OPINION_MULTIPLE}>Questão opinativa categorizada</option>
              </Field>
              <ErrorMessage
                name="type"
                render={msg => {
                  return typeof msg === 'string' 
                    ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                    : <div className="text-red-500 text-sm mt-1">Erro de validação no tipo de pergunta</div>
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Nível de Dificuldade
              </label>
              <Field
                as="select"
                name="difficulty"
                id="difficulty"
                className="input-field"
              >
                <option value={DifficultyLevel.EASY}>Simples</option>
                <option value={DifficultyLevel.MEDIUM}>Moderado</option>
                <option value={DifficultyLevel.HARD}>Complexo</option>
              </Field>
              <ErrorMessage
                name="difficulty"
                render={msg => {
                  return typeof msg === 'string' 
                    ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                    : <div className="text-red-500 text-sm mt-1">Erro de validação no nível de dificuldade</div>
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-3">
                Opções (marque a correta)
              </label>
              <FieldArray name="options">
                {({ remove, push }) => (
                  <div>
                    {values.type === QuestionType.MULTIPLE_CHOICE ? (
                      // Formulário para perguntas de múltipla escolha com resposta correta
                      <>
                        {values.options.map((option, index) => (
                          <div key={index} className="flex items-center mb-3">
                            <div className="flex-1 mr-2">
                              <Field
                                name={`options.${index}.text`}
                                type="text"
                                placeholder={`Opção ${index + 1}`}
                                className="input-field"
                              />
                              <ErrorMessage
                                name={`options.${index}.text`}
                                render={msg => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="inline-flex items-center cursor-pointer mr-2">
                                <Field
                                  type="checkbox"
                                  name={`options.${index}.isCorrect`}
                                  className="form-checkbox h-5 w-5 text-primary-600 rounded"
                                />
                                <span className="ml-2 text-sm text-secondary-700">Correta</span>
                              </label>
                              {values.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      // Formulário para perguntas opinativas (OPINION_MULTIPLE)
                      <>
                        <div className="mb-4">
                          <label htmlFor="initialExplanation" className="block text-sm font-medium text-secondary-700 mb-1">
                            Explicação Inicial
                          </label>
                          <Field
                            as="textarea"
                            id="initialExplanation"
                            name="initialExplanation"
                            rows={2}
                            className="input-field"
                            placeholder="Ex: As perguntas a seguir não têm resposta certa ou errada. Escolha a alternativa que melhor te representa."
                          />
                        </div>
                        
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Nas perguntas opinativas, cada alternativa representa uma opinião. Defina o texto e a categoria/peso de cada alternativa.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {values.options.map((option, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-md mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700">Alternativa {index + 1}</h4>
                              {values.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            
                            <div className="mb-2">
                              <label htmlFor={`options.${index}.text`} className="block text-xs font-medium text-gray-700 mb-1">
                                Texto da alternativa
                              </label>
                              <Field
                                name={`options.${index}.text`}
                                type="text"
                                placeholder="Digite o texto da alternativa"
                                className="input-field"
                              />
                              <ErrorMessage
                                name={`options.${index}.text`}
                                render={msg => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor={`options.${index}.category`} className="block text-xs font-medium text-gray-700 mb-1">
                                  Categoria/Opinião
                                </label>
                                <Field
                                  name={`options.${index}.category`}
                                  type="text"
                                  placeholder="Ex: Introvertido, Extrovertido"
                                  className="input-field"
                                />
                              </div>
                              
                              <div>
                                <label htmlFor={`options.${index}.weight`} className="block text-xs font-medium text-gray-700 mb-1">
                                  Peso (0-10)
                                </label>
                                <Field
                                  name={`options.${index}.weight`}
                                  type="number"
                                  min="0"
                                  max="10"
                                  placeholder="Peso"
                                  className="input-field"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (values.type === QuestionType.MULTIPLE_CHOICE) {
                          push({ text: '', isCorrect: false });
                        } else {
                          push({ text: '', isCorrect: false, category: '', weight: 5 });
                        }
                      }}
                      className="mt-2 flex items-center text-primary-600 hover:text-primary-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Adicionar opção
                    </button>
                  </div>
                )}
              </FieldArray>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                onClick={(e) => {
                  e.preventDefault(); // Prevenir comportamento padrão
                  console.log('Botão de adicionar pergunta clicado', { errors, values });
                  console.log('Erros de validação no momento do clique:', errors);
                  console.log('Campos tocados no momento do clique:', touched);
                  
                  // Verificar se há erros de validação
                  const hasErrors = Object.keys(errors).length > 0;
                  if (hasErrors) {
                    console.log('Formulário tem erros de validação, não será enviado');
                    return;
                  }
                  
                  // Chamar submitForm manualmente
                  console.log('Chamando submitForm manualmente');
                  submitForm();
                }}
              >
                {isSubmitting 
                  ? 'Salvando...' 
                  : isEditing 
                    ? 'Atualizar Pergunta' 
                    : 'Adicionar Pergunta'
                }
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default QuestionForm;
