import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import AdminLayout from '../../../components/admin/AdminLayout';
import { useNotification } from '../../../contexts/NotificationContext';

interface ProcessStage {
  name: string;
  description?: string;
  order: number;
  type: string;
  testId?: string;
}

interface ExpectedProfile {
  stageId: string;
  categories: {
    name: string;
    weight: number;
  }[];
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  stages: {
    id: string;
    title: string;
    questions: {
      id: string;
      type: string;
      options: {
        id: string;
        text: string;
        categoryName?: string;
      }[];
    }[];
  }[];
}

interface FormData {
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  stages: ProcessStage[];
  expectedProfiles: ExpectedProfile[];
}

const NewProcess: React.FC = () => {
  const router = useRouter();
  const { showToast } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [expectedProfiles, setExpectedProfiles] = useState<ExpectedProfile[]>([]);

  const { control, handleSubmit, register, formState: { errors }, watch } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      cutoffScore: 70,
      evaluationType: 'SCORE_BASED',
      stages: [
        {
          name: 'Teste de Conhecimento',
          description: 'Avaliação de conhecimentos técnicos',
          order: 1,
          type: 'TEST'
        }
      ],
      expectedProfiles: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stages'
  });

  const evaluationType = watch('evaluationType');

  useEffect(() => {
    // Carregar testes disponíveis
    const fetchTests = async () => {
      try {
        const response = await fetch('/api/admin/tests');
        if (response.ok) {
          const data = await response.json();
          setTests(data);
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error);
      }
    };

    fetchTests();
  }, []);

  const handleTestSelect = async (testId: string, stageIndex: number) => {
    const test = tests.find(t => t.id === testId);
    if (test) {
      setSelectedTest(test);
      
      // Verificar se o teste tem perguntas opinativas
      const hasOpinionQuestions = test.stages.some(stage => 
        stage.questions.some(q => q.type === 'OPINION_MULTIPLE')
      );

      if (hasOpinionQuestions) {
        // Coletar todas as categorias únicas das perguntas opinativas
        const uniqueCategories = new Set<string>();
        test.stages.forEach(stage => {
          stage.questions.forEach(question => {
            if (question.type === 'OPINION_MULTIPLE') {
              question.options.forEach(option => {
                if (option.categoryName) {
                  uniqueCategories.add(option.categoryName);
                }
              });
            }
          });
        });

        // Atualizar os perfis esperados para cada etapa
        const updatedExpectedProfiles = [...expectedProfiles];
        updatedExpectedProfiles[stageIndex] = {
          stageId: test.stages[0].id,
          categories: Array.from(uniqueCategories).map(name => ({
            name,
            weight: 1 // Peso padrão
          }))
        };
        setExpectedProfiles(updatedExpectedProfiles);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/admin/processes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar processo seletivo');
      }

      showToast('Processo seletivo criado com sucesso!', 'success');
      router.push('/admin/processes');
    } catch (error) {
      console.error('Erro ao criar processo seletivo:', error);
      showToast(error instanceof Error ? error.message : 'Erro ao criar processo seletivo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStage = () => {
    append({
      name: '',
      description: '',
      order: fields.length + 1,
      type: 'INTERVIEW'
    });
  };

  const stageTypes = [
    { value: 'TEST', label: 'Teste' },
    { value: 'INTERVIEW', label: 'Entrevista' },
    { value: 'TECHNICAL', label: 'Avaliação Técnica' },
    { value: 'GROUP_DYNAMIC', label: 'Dinâmica em Grupo' },
    { value: 'REFERENCE_CHECK', label: 'Verificação de Referências' },
    { value: 'BACKGROUND_CHECK', label: 'Verificação de Antecedentes' },
    { value: 'OFFER', label: 'Proposta' },
    { value: 'OTHER', label: 'Outro' }
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-800">Novo Processo Seletivo</h1>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção de Informações Básicas */}
            <div>
              <h2 className="text-xl font-semibold text-secondary-800 mb-4">Informações Básicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                    Nome do Processo Seletivo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    placeholder="Ex: Desenvolvedor Full Stack Senior"
                    {...register('name', { required: 'Nome é obrigatório' })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">Nome é obrigatório</p>
                  )}
                </div>

                <div>
                  <label htmlFor="evaluationType" className="block text-sm font-medium text-secondary-700 mb-1">
                    Tipo de Avaliação *
                  </label>
                  <select
                    id="evaluationType"
                    {...register('evaluationType', { required: 'Tipo de avaliação é obrigatório' })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="SCORE_BASED">Baseado em Pontuação</option>
                    <option value="CUSTOM">Personalizado</option>
                  </select>
                  {errors.evaluationType && (
                    <p className="mt-1 text-sm text-red-600">Tipo de avaliação é obrigatório</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                  Descrição
                </label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Descreva os objetivos e requisitos principais do processo seletivo"
                  {...register('description')}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {evaluationType === 'SCORE_BASED' && (
                <div className="mt-4">
                  <label htmlFor="cutoffScore" className="block text-sm font-medium text-secondary-700 mb-1">
                    Pontuação de Corte (%)
                  </label>
                  <div className="max-w-xs">
                    <input
                      type="number"
                      id="cutoffScore"
                      min={0}
                      max={100}
                      {...register('cutoffScore', {
                        valueAsNumber: true,
                        min: { value: 0, message: 'Pontuação mínima é 0%' },
                        max: { value: 100, message: 'Pontuação máxima é 100%' }
                      })}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  {errors.cutoffScore && (
                    <p className="mt-1 text-sm text-red-600">
                      Pontuação deve estar entre 0% e 100%
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Seção de Etapas */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-800">Etapas do Processo</h2>
                  <p className="text-sm text-secondary-600 mt-1">Defina as etapas que os candidatos deverão passar</p>
                </div>
                <button
                  type="button"
                  onClick={addStage}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Adicionar Etapa</span>
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 bg-secondary-50 rounded-md border-2 border-dashed border-secondary-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-4 text-secondary-600">Nenhuma etapa adicionada</p>
                  <p className="text-sm text-secondary-500">Clique em "Adicionar Etapa" para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-secondary-50 rounded-md p-6 relative">
                      <div className="absolute top-4 right-4">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-secondary-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Nome da Etapa *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Entrevista Técnica"
                            {...register(`stages.${index}.name` as const, { required: 'Nome da etapa é obrigatório' })}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                          {errors.stages?.[index]?.name && (
                            <p className="mt-1 text-sm text-red-600">Nome da etapa é obrigatório</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Tipo de Etapa *
                          </label>
                          <select
                            {...register(`stages.${index}.type` as const, { required: 'Tipo de etapa é obrigatório' })}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            {stageTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                          {errors.stages?.[index]?.type && (
                            <p className="mt-1 text-sm text-red-600">Tipo de etapa é obrigatório</p>
                          )}
                        </div>
                      </div>

                      {watch(`stages.${index}.type`) === 'TEST' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Selecionar Teste
                          </label>
                          <select
                            {...register(`stages.${index}.testId`)}
                            onChange={(e) => handleTestSelect(e.target.value, index)}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Selecione um teste</option>
                            {tests.map(test => (
                              <option key={test.id} value={test.id}>{test.title}</option>
                            ))}
                          </select>

                          {expectedProfiles[index]?.categories.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-secondary-700 mb-2">
                                Perfil Esperado
                              </h4>
                              <p className="text-sm text-secondary-600 mb-3">
                                Defina o peso de cada característica para o perfil ideal do candidato
                              </p>
                              <div className="space-y-3">
                                {expectedProfiles[index].categories.map((category, catIndex) => (
                                  <div key={category.name} className="flex items-center gap-4">
                                    <span className="text-sm text-secondary-700 min-w-[150px]">
                                      {category.name}
                                    </span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="5"
                                      step="1"
                                      value={category.weight}
                                      onChange={(e) => {
                                        const newProfiles = [...expectedProfiles];
                                        newProfiles[index].categories[catIndex].weight = parseInt(e.target.value);
                                        setExpectedProfiles(newProfiles);
                                      }}
                                      className="flex-1"
                                    />
                                    <span className="text-sm text-secondary-600 min-w-[30px]">
                                      {category.weight}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Descrição
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Descreva os objetivos e critérios desta etapa"
                          {...register(`stages.${index}.description` as const)}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <input
                        type="hidden"
                        {...register(`stages.${index}.order` as const)}
                        value={index + 1}
                      />
                      
                      <div className="mt-4 pt-4 border-t border-secondary-200">
                        <p className="text-sm text-secondary-500">Etapa {index + 1} de {fields.length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Salvar Processo Seletivo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NewProcess;
