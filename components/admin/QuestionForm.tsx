import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { QuestionType, QuestionDifficulty } from '../../types/questions';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface QuestionFormProps {
  onSubmit: (values: any) => void;
  isEditing?: boolean;
  initialValues?: any;
  preSelectedStageId?: string;
  stages?: any[];
  categories?: any[];
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  onSubmit,
  isEditing = false,
  initialValues = null,
  preSelectedStageId = '',
  stages = [],
  categories = []
}) => {
  const notify = useNotificationSystem();
  const [existingOpinions, setExistingOpinions] = useState<string[]>([]);
  const [opinionGroups, setOpinionGroups] = useState<{[key: string]: string[]}>({});

  // Validação do formulário
  const validationSchema = Yup.object().shape({
    text: Yup.string().required('Texto da pergunta é obrigatório'),
    stageId: Yup.string().nullable(),
    options: Yup.array().of(
      Yup.object().shape({
        text: Yup.string().required('Texto da opção é obrigatório'),
        isCorrect: Yup.boolean()
      })
    ).min(2, 'Pelo menos duas opções são necessárias')
    .test(
      'at-least-one-correct',
      'Pelo menos uma opção deve ser marcada como correta',
      (options) => options && options.some(option => option.isCorrect)
    ),
    difficulty: Yup.string().required('Nível de dificuldade é obrigatório')
  });

  const defaultValues = {
    text: '',
    stageId: preSelectedStageId || (stages && stages.length > 0 ? stages[0].id : null),
    categoryId: '',
    categoryUuid: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    type: QuestionType.MULTIPLE_CHOICE,
    difficulty: QuestionDifficulty.EASY,
  };

  // Preparar valores iniciais para o formulário
  const getInitialValues = () => {
    if (initialValues) {
      return {
        ...initialValues,
        categoryUuid: initialValues.categoryId || '',
      };
    }

    // Valores padrão para novo formulário
    let defaultStageId = '';
    if (preSelectedStageId) {
      defaultStageId = preSelectedStageId;
    } else if (stages && stages.length > 0) {
      defaultStageId = stages[0].id;
    }
    
    return {
      text: '',
      stageId: defaultStageId,
      categoryId: '',
      categoryUuid: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: QuestionDifficulty.EASY,
    };
  };

  // Manipular envio do formulário
  const handleSubmit = (values: any, { setSubmitting }: any) => {
    // Preparar dados para envio
    const formData = {
      ...values,
      // Se categoryUuid estiver definido, usá-lo como categoryId
      categoryId: values.categoryUuid || values.categoryId || null,
    };
    
    // Remover campos desnecessários
    delete formData.categoryUuid;
    
    onSubmit(formData);
    setSubmitting(false);
  };

  return (
    <Formik
      initialValues={getInitialValues()}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, isSubmitting, setFieldValue }) => (
        <Form className="space-y-4">
          {/* Texto da pergunta */}
          <div className="mb-4">
            <label htmlFor="text" className="block text-sm font-medium text-secondary-700 mb-1">
              Texto da Pergunta
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
              render={msg => <div className="text-red-500 text-sm mt-1">{msg}</div>}
            />
          </div>

          {/* Etapa */}
          <div className="mb-4">
            {preSelectedStageId ? (
              <Field 
                type="hidden" 
                name="stageId" 
                value={preSelectedStageId || (stages && stages.length > 0 ? stages[0].id : '')} 
              />
            ) : (
              <>
                <label htmlFor="stageId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Etapa
                </label>
                <Field
                  as="select"
                  id="stageId"
                  name="stageId"
                  className="input-field"
                  disabled={!!preSelectedStageId}
                >
                  {stages && stages.length === 0 ? (
                    <option value="">Nenhuma etapa disponível</option>
                  ) : (
                    stages
                      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                      .map((stage: any) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.title}
                        </option>
                      ))
                  )}
                </Field>
              </>
            )}
          </div>

          {/* Categoria */}
          <div className="mb-4">
            <label htmlFor="categoryUuid" className="block text-sm font-medium text-secondary-700 mb-1">
              Categoria (opcional)
            </label>
            <Field
              as="select"
              id="categoryUuid"
              name="categoryUuid"
              className="input-field"
            >
              <option value="">Selecione uma categoria</option>
              {categories && categories.length > 0 && categories.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Field>
          </div>

          {/* Nível de dificuldade */}
          <div className="mb-4">
            <label htmlFor="difficulty" className="block text-sm font-medium text-secondary-700 mb-1">
              Nível de Dificuldade
            </label>
            <Field
              as="select"
              name="difficulty"
              id="difficulty"
              className="input-field"
            >
              <option value={QuestionDifficulty.EASY}>Fácil</option>
              <option value={QuestionDifficulty.MEDIUM}>Médio</option>
              <option value={QuestionDifficulty.HARD}>Difícil</option>
            </Field>
            <ErrorMessage
              name="difficulty"
              render={msg => <div className="text-red-500 text-sm mt-1">{msg}</div>}
            />
          </div>

          {/* Opções */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Opções
            </label>
            
            <FieldArray name="options">
              {({ remove, push }) => (
                <div>
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
                  
                  <button
                    type="button"
                    onClick={() => {
                      push({ text: '', isCorrect: false });
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

          {/* Botões de ação */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                <>
                  {isEditing ? 'Atualizar' : 'Criar'} Pergunta
                </>
              )}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default QuestionForm;
