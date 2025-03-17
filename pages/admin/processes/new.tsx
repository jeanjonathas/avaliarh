import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import AdminLayout from '../../../components/admin/AdminLayout';
import { useNotification } from '../../../contexts/NotificationContext';

interface ProcessStage {
  name: string;
  description?: string;
  order: number;
  type: string;
}

interface FormData {
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  stages: ProcessStage[];
}

const NewProcess: React.FC = () => {
  const router = useRouter();
  const { showToast } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stages'
  });

  const evaluationType = watch('evaluationType');

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
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Novo Processo Seletivo</h1>
          <p className="text-gray-600 mt-1">Crie um novo processo seletivo e defina suas etapas</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome do Processo Seletivo *
              </label>
              <input
                type="text"
                id="name"
                {...register('name', { required: 'Nome é obrigatório' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="evaluationType" className="block text-sm font-medium text-gray-700">
                Tipo de Avaliação *
              </label>
              <select
                id="evaluationType"
                {...register('evaluationType', { required: 'Tipo de avaliação é obrigatório' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="SCORE_BASED">Baseado em Pontuação</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
              {errors.evaluationType && (
                <p className="mt-1 text-sm text-red-600">{errors.evaluationType.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {evaluationType === 'SCORE_BASED' && (
            <div>
              <label htmlFor="cutoffScore" className="block text-sm font-medium text-gray-700">
                Pontuação de Corte (%)
              </label>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {errors.cutoffScore && (
                <p className="mt-1 text-sm text-red-600">{errors.cutoffScore.message}</p>
              )}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">Etapas do Processo</h2>
              <button
                type="button"
                onClick={addStage}
                className="px-3 py-1 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-sm"
              >
                Adicionar Etapa
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">Nenhuma etapa adicionada. Clique em "Adicionar Etapa" para começar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-md p-4 bg-gray-50 relative">
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nome da Etapa *
                        </label>
                        <input
                          type="text"
                          {...register(`stages.${index}.name` as const, { required: 'Nome da etapa é obrigatório' })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        {errors.stages?.[index]?.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.stages[index]?.name?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Tipo de Etapa *
                        </label>
                        <select
                          {...register(`stages.${index}.type` as const, { required: 'Tipo de etapa é obrigatório' })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          {stageTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        {errors.stages?.[index]?.type && (
                          <p className="mt-1 text-sm text-red-600">{errors.stages[index]?.type?.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Descrição
                      </label>
                      <textarea
                        rows={2}
                        {...register(`stages.${index}.description` as const)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>

                    <input
                      type="hidden"
                      {...register(`stages.${index}.order` as const)}
                      value={index + 1}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:bg-primary-300"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Processo Seletivo'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default NewProcess;
