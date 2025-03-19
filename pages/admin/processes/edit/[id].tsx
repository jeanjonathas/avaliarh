import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import AdminLayout from '../../../../components/admin/AdminLayout';
import { useNotification } from '../../../../contexts/NotificationContext';
import CollapsibleTestTable from '../../../../components/admin/processes/CollapsibleTestTable';

interface ProcessStage {
  id?: string;
  name: string;
  description?: string;
  order: number;
  type: string;
  testId?: string;
}

interface FormData {
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  stages: ProcessStage[];
}

interface Question {
  id: string;
  text: string;
  type: string;
}

interface Stage {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
}

interface Test {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  active: boolean;
  stages?: Stage[];
  sectionsCount?: number;
  questionsCount?: number;
}

const stageTypes = [
  { value: 'TEST', label: 'Teste' },
  { value: 'INTERVIEW', label: 'Entrevista' },
  { value: 'TECHNICAL', label: 'Avaliação Técnica' },
  { value: 'GROUP_DYNAMIC', label: 'Dinâmica em Grupo' }
];

const EditProcess: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [detailedTests, setDetailedTests] = useState<{[key: string]: Test}>({});

  const { control, handleSubmit, register, formState: { errors }, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      evaluationType: 'SCORE_BASED',
      stages: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stages'
  });

  // Carregar dados do processo seletivo
  useEffect(() => {
    const fetchProcess = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/processes/${id}`);
        if (response.ok) {
          const process = await response.json();
          
          // Resetar o formulário com os dados do processo
          reset({
            name: process.name,
            description: process.description,
            evaluationType: process.evaluationType,
            cutoffScore: process.cutoffScore,
            stages: process.stages.map((stage: ProcessStage) => ({
              id: stage.id,
              name: stage.name,
              description: stage.description,
              order: stage.order,
              type: stage.type,
              testId: stage.testId
            }))
          });
        } else {
          showToast('Erro ao carregar processo seletivo', 'error');
          router.push('/admin/processes');
        }
      } catch (error) {
        console.error('Erro ao carregar processo:', error);
        showToast('Erro ao carregar processo seletivo', 'error');
        router.push('/admin/processes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProcess();
  }, [id, reset, router, showToast]);

  // Carregar testes disponíveis
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setIsLoadingTests(true);
        const response = await fetch('/api/admin/tests');
        if (response.ok) {
          const { tests: testsData } = await response.json();
          setTests(testsData);
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error);
        showToast('Erro ao carregar testes disponíveis', 'error');
      } finally {
        setIsLoadingTests(false);
      }
    };

    fetchTests();
  }, [showToast]);

  // Carregar detalhes dos testes quando necessário
  const loadTestDetails = async (testId: string) => {
    if (detailedTests[testId]) return;
    
    try {
      const response = await fetch(`/api/admin/tests/${testId}`);
      if (response.ok) {
        const testData = await response.json();
        setDetailedTests(prev => ({
          ...prev,
          [testId]: testData
        }));
      }
    } catch (error) {
      console.error(`Erro ao carregar detalhes do teste ${testId}:`, error);
    }
  };

  const handleTestSelect = async (testId: string, stageIndex: number) => {
    setValue(`stages.${stageIndex}.testId`, testId);
    
    // Carregar detalhes do teste selecionado
    if (testId) {
      loadTestDetails(testId);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!id) return;

    try {
      setIsSubmitting(true);
      showToast('Salvando alterações...', 'info');

      const response = await fetch(`/api/admin/processes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          stages: data.stages.map((stage, index) => ({
            ...stage,
            order: index + 1,
            testId: stage.type === 'TEST' && stage.testId ? stage.testId : null
          }))
        }),
      });

      if (response.ok) {
        showToast('Processo seletivo atualizado com sucesso!', 'success');
        localStorage.removeItem('processDraft');
        router.push('/admin/processes');
      } else {
        const error = await response.json();
        showToast(error.message || 'Erro ao atualizar processo seletivo', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar processo seletivo:', error);
      showToast('Erro ao atualizar processo seletivo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-secondary-900 mb-6">
            Editar Processo Seletivo
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Nome do Processo *
              </label>
              <input
                type="text"
                placeholder="Ex: Desenvolvedor Full Stack 2024"
                {...register('name', { required: 'Nome é obrigatório' })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">Nome é obrigatório</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Descrição
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Descreva o processo seletivo..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Tipo de Avaliação *
              </label>
              <select
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

            {watch('evaluationType') === 'SCORE_BASED' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Pontuação de Corte (%)
                </label>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    {...register('cutoffScore', {
                      min: { value: 0, message: 'Mínimo é 0%' },
                      max: { value: 100, message: 'Máximo é 100%' }
                    })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {errors.cutoffScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.cutoffScore.message}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-secondary-900">Etapas</h2>
                <button
                  type="button"
                  onClick={() => append({
                    name: '',
                    description: '',
                    order: fields.length + 1,
                    type: 'TEST'
                  })}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Adicionar Etapa
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 p-4 rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-medium text-secondary-900">
                      Etapa {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome da Etapa *
                      </label>
                      <input
                        type="text"
                        {...register(`stages.${index}.name` as const, {
                          required: 'Nome da etapa é obrigatório'
                        })}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      {errors.stages?.[index]?.name && (
                        <p className="mt-1 text-sm text-red-600">Nome da etapa é obrigatório</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Tipo *
                      </label>
                      <select
                        {...register(`stages.${index}.type` as const)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        {stageTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      {...register(`stages.${index}.description` as const)}
                      rows={2}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {watch(`stages.${index}.type`) === 'TEST' && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Selecionar Teste
                      </label>
                      
                      {/* Campo oculto para armazenar o ID do teste selecionado */}
                      <input 
                        type="hidden" 
                        {...register(`stages.${index}.testId` as const)} 
                      />
                      
                      {isLoadingTests ? (
                        <div className="animate-pulse">
                          <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
                        </div>
                      ) : (
                        <CollapsibleTestTable 
                          tests={tests}
                          selectedTestId={watch(`stages.${index}.testId`) || ''}
                          onTestSelect={(testId) => handleTestSelect(testId, index)}
                        />
                      )}
                      
                      {/* Exibir o teste selecionado */}
                      {watch(`stages.${index}.testId`) && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-800">
                            Teste selecionado: {tests.find(t => t.id === watch(`stages.${index}.testId`))?.title || 'Carregando...'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin/processes')}
                className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EditProcess;
