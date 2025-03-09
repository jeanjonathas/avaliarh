import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';

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
  options: Option[];
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
  hideStageField = false
}) => {
  const [error, setError] = useState('');

  const defaultValues = {
    text: '',
    stageId: preSelectedStageId || (stages.length > 0 ? stages[0].id : ''),
    categoryId: preSelectedCategoryId || '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
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

    if (!hideStageField) {
      return Yup.object({
        ...baseSchema,
        stageId: Yup.string().required('Etapa é obrigatória'),
      });
    }

    return Yup.object(baseSchema);
  };

  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      setError('');
      await onSubmit(values);
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro no formulário:', error);
      setError(error.message || 'Ocorreu um erro ao processar o formulário');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-secondary-800 mb-4">
        {isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <Formik
        initialValues={initialValues || defaultValues}
        validationSchema={getValidationSchema()}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, isSubmitting, setFieldValue }) => (
          <Form className="space-y-6">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-secondary-700 mb-1">
                Pergunta
              </label>
              <Field
                as="textarea"
                name="text"
                id="text"
                rows={3}
                className="input-field"
                placeholder="Digite o texto da pergunta"
              />
              <ErrorMessage name="text" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
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
                <ErrorMessage name="stageId" component="div" className="text-red-500 text-sm mt-1" />
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
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Field>
              <ErrorMessage name="categoryId" component="div" className="text-red-500 text-sm mt-1" />
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
                            component="div"
                            className="text-red-500 text-sm mt-1"
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
                      component="div"
                      className="text-red-500 text-sm mt-1"
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
