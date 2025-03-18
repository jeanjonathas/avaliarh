import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNotification } from '../../../contexts/NotificationContext';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: string;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone?: string;
  instagram?: string;
  resumeUrl?: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
  phone: Yup.string(),
  instagram: Yup.string(),
  resumeUrl: Yup.string().url('URL inválida')
});

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  isOpen,
  onClose,
  processId,
  onSuccess
}) => {
  const { showToast } = useNotification();

  const handleSubmit = async (values: FormData, { setSubmitting, resetForm }: any) => {
    try {
      const response = await fetch('/api/admin/processes/candidates/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          processId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao adicionar candidato');
      }

      showToast('Candidato adicionado com sucesso!', 'success');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error);
      showToast(
        error instanceof Error ? error.message : 'Erro ao adicionar candidato',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-secondary-200">
          <div>
            <h3 className="text-xl font-semibold text-secondary-800">Adicionar Candidato</h3>
            <p className="mt-1 text-sm text-secondary-500">
              Preencha os dados do candidato para adicioná-lo ao processo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-500"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Formik
          initialValues={{
            name: '',
            email: '',
            phone: '',
            instagram: '',
            resumeUrl: ''
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                  Nome
                </label>
                <Field
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome completo"
                />
                <ErrorMessage
                  name="name"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                  E-mail
                </label>
                <Field
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="email@exemplo.com"
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                  Telefone
                </label>
                <Field
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="(00) 00000-0000"
                />
                <ErrorMessage
                  name="phone"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div>
                <label htmlFor="instagram" className="block text-sm font-medium text-secondary-700 mb-1">
                  Instagram
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-secondary-300 bg-secondary-50 text-secondary-500 sm:text-sm">
                    @
                  </span>
                  <Field
                    type="text"
                    id="instagram"
                    name="instagram"
                    className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="usuario"
                  />
                </div>
                <ErrorMessage
                  name="instagram"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div>
                <label htmlFor="resumeUrl" className="block text-sm font-medium text-secondary-700 mb-1">
                  Link do Currículo
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-secondary-300 bg-secondary-50 text-secondary-500 sm:text-sm">
                    https://
                  </span>
                  <Field
                    type="text"
                    id="resumeUrl"
                    name="resumeUrl"
                    className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="www.exemplo.com/curriculo"
                  />
                </div>
                <ErrorMessage
                  name="resumeUrl"
                  component="div"
                  className="mt-1 text-sm text-red-600"
                />
              </div>

              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddCandidateModal;
