import React from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../../components/admin/AdminLayout';
import QuestionForm from '../../../components/admin/QuestionForm';
import { Button } from '../../../components/ui/Button';
import { useNotificationSystem } from '../../../hooks/useNotificationSystem';

const AddQuestionPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const notify = useNotificationSystem();

  const handleCancel = () => {
    router.push('/admin/questions');
  };

  const handleSubmit = async (values: any) => {
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notify.showSuccess('Pergunta criada com sucesso!');
        router.push('/admin/questions');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar pergunta');
      }
    } catch (error) {
      console.error('Erro ao criar pergunta:', error);
      notify.showError(`Erro ao criar pergunta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Verificar autenticação
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Pergunta de Múltipla Escolha</h1>
          <Button 
            variant="secondary" 
            onClick={handleCancel}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <QuestionForm 
            onSubmit={handleSubmit}
            isEditing={false}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddQuestionPage;
