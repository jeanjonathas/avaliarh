import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray, FormikConsumer, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

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
}

interface Question {
  id?: string;
  text: string;
  stageId: string;
  categoryId?: string;
  categoryUuid?: string;
  options: Option[];
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
      };
    }

    // Retornar valores existentes
    return {
      text: initialValues?.text || '',
      stageId: initialValues?.stageId || defaultStageId,
      categoryId: initialValues?.categoryId || (preSelectedCategoryId || ''),
      categoryUuid: initialValues?.categoryUuid || (preSelectedCategoryId || ''),
      options: initialValues?.options || [],
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

      // Verificar se há pelo menos uma opção correta
      const hasCorrectOption = values.options.some((option: any) => option.isCorrect);
      if (!hasCorrectOption) {
        setError('Pelo menos uma opção deve ser marcada como correta');
        notify.showError('Pelo menos uma opção deve ser marcada como correta');
        setSubmitting(false);
        setLoading(false);
        return;
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
              <label className="block text-sm font-medium text-secondary-700 mb-3">
                Opções (marque a correta)
              </label>
              
              <FieldArray name="options">
                {({ remove, push }) => (
                  <div className="space-y-3">
                    {values.options.map((option, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="pt-2">
                          <Field
                            type="radio"
                            name={`options.${index}.isCorrect`}
                            id={`option-correct-${index}`}
                            checked={option.isCorrect}
                            onChange={() => {
                              setFieldValue(`options.${index}.isCorrect`, true)
                              values.options.forEach((_, i) => {
                                if (i !== index) {
                                  setFieldValue(`options.${i}.isCorrect`, false)
                                }
                              })
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                          />
                        </div>
                        <div className="flex-grow">
                          <Field
                            type="text"
                            name={`options.${index}.text`}
                            placeholder={`Opção ${index + 1}`}
                            className="input-field"
                          />
                          <ErrorMessage
                            name={`options.${index}.text`}
                            render={msg => {
                              return typeof msg === 'string' 
                                ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                                : <div className="text-red-500 text-sm mt-1">Erro de validação na opção</div>
                            }}
                          />
                        </div>
                        {values.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {values.options.length < 5 && (
                      <button
                        type="button"
                        onClick={() => push({ text: '', isCorrect: false })}
                        className="mt-2 text-primary-600 hover:text-primary-800 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-1 1h-3a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Adicionar Opção
                      </button>
                    )}
                    
                    <ErrorMessage
                      name="options"
                      render={msg => {
                        return typeof msg === 'string' 
                          ? <div className="text-red-500 text-sm mt-1">{msg}</div>
                          : <div className="text-red-500 text-sm mt-1">Erro de validação nas opções</div>
                      }}
                    />
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
