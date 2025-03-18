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

interface FormDraft {
  name: string;
  description?: string;
  evaluationType: string;
  cutoffScore?: number;
  stages: ProcessStage[];
}

interface FormData {
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  stages: ProcessStage[];
}

interface Test {
  id: string;
  title: string;
}

const stageTypes = [
  { value: 'TEST', label: 'Teste' },
  { value: 'INTERVIEW', label: 'Entrevista' },
  { value: 'TECHNICAL', label: 'Avaliação Técnica' },
  { value: 'GROUP_DYNAMIC', label: 'Dinâmica em Grupo' }
];

const NewProcess: React.FC = () => {
  const router = useRouter();
  const { showToast } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);

  const { control, handleSubmit, register, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      evaluationType: 'SCORE_BASED',
      stages: [
        {
          name: '',
          description: '',
          order: 1,
          type: 'TEST'
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stages'
  });

  useEffect(() => {
    // Carregar testes disponíveis
    const fetchTests = async () => {
      try {
        const response = await fetch('/api/admin/tests');
        if (response.ok) {
          const { tests: testsData } = await response.json();
          setTests(testsData.map(test => ({
            id: test.id,
            title: test.title
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error);
        showToast('Erro ao carregar testes disponíveis', 'error');
      }
    };

    fetchTests();
  }, [showToast]);

  const handleTestSelect = async (testId: string, stageIndex: number) => {
    if (testId) {
      // Salvar o estado atual do formulário em localStorage
      const currentFormData = {
        name: watch('name'),
        description: watch('description'),
        evaluationType: watch('evaluationType'),
        cutoffScore: watch('cutoffScore'),
        stages: watch('stages')
      };
      localStorage.setItem('processDraft', JSON.stringify(currentFormData));
      
      // Redirecionar para a página do teste
      router.push(`/admin/test/${testId}`);
    }
  };

  // Recuperar rascunho ao montar o componente
  useEffect(() => {
    const draft = localStorage.getItem('processDraft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft) as FormDraft;
        
        // Atualizar os campos do formulário com os dados do rascunho
        setValue('name', draftData.name);
        setValue('description', draftData.description);
        setValue('evaluationType', draftData.evaluationType);
        setValue('cutoffScore', draftData.cutoffScore);
        
        // Atualizar as etapas
        draftData.stages.forEach((stage, index) => {
          setValue(`stages.${index}`, stage);
        });
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        localStorage.removeItem('processDraft');
      }
    }
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/admin/processes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast('Processo seletivo criado com sucesso!', 'success');
        localStorage.removeItem('processDraft'); // Limpar rascunho após salvar
        router.push('/admin/processes');
      } else {
        const error = await response.json();
        showToast(error.message || 'Erro ao criar processo seletivo', 'error');
      }
    } catch (error) {
      console.error('Erro ao criar processo seletivo:', error);
      showToast('Erro ao criar processo seletivo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-secondary-900 mb-6">
            Novo Processo Seletivo
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
                      min: 0,
                      max: 100,
                      valueAsNumber: true
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-secondary-800">
                  Etapas do Processo
                </h2>
                <button
                  type="button"
                  onClick={() => append({ name: '', description: '', order: fields.length + 1, type: 'TEST' })}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Adicionar Etapa
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="bg-secondary-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-secondary-800">
                      Etapa {index + 1}
                    </h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    )}
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
                        {Array.isArray(tests) && tests.map(test => (
                          <option key={test.id} value={test.id}>{test.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      {...register(`stages.${index}.description`)}
                      placeholder="Descreva os objetivos e requisitos desta etapa"
                      rows={3}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NewProcess;
