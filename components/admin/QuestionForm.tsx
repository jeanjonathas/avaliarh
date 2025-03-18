import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { QuestionType, QuestionDifficulty } from '../../types/questions';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';
import dynamic from 'next/dynamic';

// Importar o React Quill dinamicamente para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded"></div>
});

// Importar os estilos do Quill
import 'react-quill/dist/quill.snow.css';

// Estilos customizados para o editor
const editorStyles = {
  editor: {
    minHeight: '200px',
  },
};

// Estilos globais para o conteúdo do editor
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    .ql-editor, .ql-editor p, .ql-editor span {
      font-size: 20px !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

interface Option {
  text: string;
  isCorrect: boolean;
}

interface QuestionFormProps {
  onSubmit: (values: any) => void;
  isEditing?: boolean;
  initialValues?: any;
  categories?: any[];
  stages?: any[];
  preSelectedStageId?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  hideStageField?: boolean;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  onSubmit,
  isEditing = false,
  initialValues = null,
  categories = [],
  stages = [],
  preSelectedStageId = '',
  onCancel,
  onSuccess,
  hideStageField = false
}) => {
  const notify = useNotificationSystem();
  const [existingOpinions, setExistingOpinions] = useState<string[]>([]);
  const [opinionGroups, setOpinionGroups] = useState<{[key: string]: string[]}>({});

  useEffect(() => {
    console.log('QuestionForm - Valores iniciais:', initialValues);
    console.log('QuestionForm - Categorias disponíveis:', categories);
    console.log('QuestionForm - Etapas disponíveis:', stages);
    console.log('QuestionForm - Etapa pré-selecionada:', preSelectedStageId);
  }, [initialValues, categories, stages, preSelectedStageId]);

  // Validação do formulário
  const validationSchema = Yup.object().shape({
    text: Yup.string().required('Texto da pergunta é obrigatório'),
    options: Yup.array().of(
      Yup.object().shape({
        text: Yup.string().required('Texto da opção é obrigatório'),
        isCorrect: Yup.boolean()
      })
    ).min(2, 'Pelo menos duas opções são necessárias')
    .test(
      'exactly-one-correct',
      'Exatamente uma opção deve ser marcada como correta',
      (options) => options && options.filter(option => option.isCorrect).length === 1
    ),
    difficulty: Yup.string().required('Nível de dificuldade é obrigatório')
  });

  const defaultValues = {
    text: '',
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
      console.log('Valores iniciais da pergunta:', initialValues);
      console.log('Opções recebidas:', initialValues.options);
      
      // Verificar se as opções existem e são um array
      const options = Array.isArray(initialValues.options) && initialValues.options.length > 0 
        ? initialValues.options 
        : [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ];
      
      console.log('Opções processadas:', options);
      
      return {
        ...initialValues,
        categoryUuid: initialValues.categoryId || initialValues.categoryUuid || '',
        options: options,
      };
    }
    
    return {
      text: '',
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
      // Se categoryUuid estiver definido e não for string vazia, usá-lo como categoryId
      // Caso contrário, definir explicitamente como null para remover a categoria
      categoryId: values.categoryUuid && values.categoryUuid !== "" ? values.categoryUuid : null,
    };
    
    // Log para debug
    console.log('Enviando formulário com os seguintes dados:', formData);
    console.log('Categoria selecionada:', formData.categoryId);
    
    // Remover campos desnecessários
    delete formData.categoryUuid;
    
    // Garantir que options seja um array
    if (!Array.isArray(formData.options)) {
      console.error('Erro: options não é um array', formData.options);
      notify.showError('Erro ao processar opções da pergunta');
      setSubmitting(false);
      return;
    }
    
    // Verificar se há pelo menos uma opção marcada como correta
    const hasCorrectOption = formData.options.some((option: any) => option.isCorrect);
    if (!hasCorrectOption) {
      notify.showError('Pelo menos uma opção deve ser marcada como correta');
      setSubmitting(false);
      return;
    }
    
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
        <Form className="space-y-4" style={{overflow: 'auto'}}>
          {/* Texto da pergunta */}
          <div className="mb-4">
            <label htmlFor="text" className="block text-sm font-medium text-secondary-700 mb-1">
              Texto da Pergunta
            </label>
            <ReactQuill
              id="text"
              style={editorStyles.editor}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{'list': 'ordered'}, {'list': 'bullet'}],
                  ['link'],
                  ['clean']
                ],
                clipboard: {
                  matchVisual: false,
                },
              }}
              formats={[
                'header',
                'bold', 'italic', 'underline', 'strike',
                'list', 'bullet',
                'link'
              ]}
              placeholder="Digite o texto da pergunta"
              theme="snow"
              value={values.text}
              onChange={(content) => {
                setFieldValue('text', content);
              }}
              className="mb-2"
            />
            <ErrorMessage
              name="text"
              render={msg => <div className="text-red-500 text-sm mt-1">{msg}</div>}
            />
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const value = e.target.value;
                console.log('Categoria selecionada no dropdown:', value);
                setFieldValue('categoryUuid', value);
              }}
            >
              <option value="">Selecione uma categoria</option>
              {categories && categories.length > 0 ? (
                categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Nenhuma categoria disponível</option>
              )}
            </Field>
            {categories && categories.length > 0 ? (
              <div className="text-xs text-gray-500 mt-1">
                {categories.length} categorias disponíveis
              </div>
            ) : (
              <div className="text-xs text-red-500 mt-1">
                Nenhuma categoria disponível
              </div>
            )}
          </div>

          {/* Nível de dificuldade */}
          <div className="mb-4">
            <label htmlFor="difficulty" className="block text-sm font-medium text-secondary-700 mb-1">
              Nível de Dificuldade
            </label>
            <Field
              as="select"
              id="difficulty"
              name="difficulty"
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

          {/* Opções de resposta */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Opções de Resposta
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Adicione pelo menos duas opções e marque exatamente uma como correta.
            </p>
            
            <FieldArray name="options">
              {({ remove, push }) => (
                <div>
                  {values.options.length > 0 &&
                    values.options.map((option, index) => (
                      <div key={index} className="flex flex-col mb-4 p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <span className="font-medium text-gray-700 mr-2">Opção {index + 1}</span>
                          {values.options.length > 2 && (
                            <button
                              type="button"
                              className="ml-auto text-red-500 hover:text-red-700"
                              onClick={() => remove(index)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        <div className="mb-2">
                          <Field
                            as="textarea"
                            name={`options.${index}.text`}
                            placeholder="Texto da opção"
                            className="input-field"
                            rows={2}
                          />
                          <ErrorMessage
                            name={`options.${index}.text`}
                            render={msg => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <label className="inline-flex items-center">
                            <Field
                              type="radio"
                              name="correctOption"
                              checked={option.isCorrect}
                              onChange={() => {
                                // Desmarcar todas as opções
                                values.options.forEach((_, optIndex) => {
                                  setFieldValue(`options.${optIndex}.isCorrect`, false);
                                });
                                // Marcar apenas a opção atual
                                setFieldValue(`options.${index}.isCorrect`, true);
                              }}
                              className="form-radio h-4 w-4 text-primary-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Resposta correta</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  
                  {errors.options && typeof errors.options === 'string' && (
                    <div className="text-red-500 text-sm mb-2">{errors.options}</div>
                  )}
                  
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={() => push({ text: '', isCorrect: false })}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Opção
                  </button>
                </div>
              )}
            </FieldArray>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isEditing ? 'Atualizar Pergunta' : 'Criar Pergunta'}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default QuestionForm;
