import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import AdminLayout from '../../../components/admin/AdminLayout';
import { useNotification } from '../../../contexts/NotificationContext';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  phone?: string;
  instagram?: string;
  resumeUrl?: string;
  requestPhoto: boolean;
  showResults: boolean;
}

const NewCandidate: React.FC = () => {
  const router = useRouter();
  const { processId } = router.query;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useNotification();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      requestPhoto: true,
      showResults: true
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      const endpoint = processId 
        ? '/api/admin/processes/candidates/add'
        : '/api/admin/candidates/create';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          ...(processId && { processId })
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao adicionar candidato');
      }

      showToast('Candidato adicionado com sucesso!', 'success');
      
      if (processId) {
        router.push(`/admin/processes/${processId}`);
      } else {
        router.push('/admin/candidates');
      }
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error);
      showToast(
        error instanceof Error ? error.message : 'Erro ao adicionar candidato',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {processId ? 'Adicionar Candidato ao Processo' : 'Novo Candidato'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Preencha os dados do candidato para adicioná-lo ao sistema.
              </p>
            </div>
            <Link 
              href={processId ? `/admin/processes/${processId}` : '/admin/candidates'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Voltar
            </Link>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Nome é obrigatório' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  placeholder="Nome completo"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email', {
                    required: 'E-mail é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'E-mail inválido'
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                  Instagram
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    id="instagram"
                    {...register('instagram')}
                    className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    placeholder="usuario"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="resumeUrl" className="block text-sm font-medium text-gray-700">
                  Link do Currículo
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    https://
                  </span>
                  <input
                    type="text"
                    id="resumeUrl"
                    {...register('resumeUrl')}
                    className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    placeholder="www.exemplo.com/curriculo"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-4">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="requestPhoto"
                      {...register('requestPhoto')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="requestPhoto" className="font-medium text-gray-700">
                      Solicitar foto
                    </label>
                    <p className="text-gray-500">O candidato será solicitado a enviar uma foto para identificação.</p>
                  </div>
                </div>

                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="showResults"
                      {...register('showResults')}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="showResults" className="font-medium text-gray-700">
                      Mostrar resultados
                    </label>
                    <p className="text-gray-500">O candidato poderá ver seus resultados após completar as etapas.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <Link 
                href={processId ? `/admin/processes/${processId}` : '/admin/candidates'}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Candidato'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NewCandidate;
