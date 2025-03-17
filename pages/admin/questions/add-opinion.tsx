import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Button } from '../../../components/ui/Button';
import { useNotificationSystem } from '../../../hooks/useNotificationSystem';
import OpinionQuestionWizard from '../../../components/admin/OpinionQuestionWizard';
import Modal from '../../../components/ui/Modal';

const AddOpinionQuestionPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const notify = useNotificationSystem();
  const [loading, setLoading] = useState(false);
  const [lastCreatedQuestion, setLastCreatedQuestion] = useState<any>(null);
  const [showCreateAnotherModal, setShowCreateAnotherModal] = useState(false);

  const handleCancel = () => {
    router.push('/admin/questions');
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Adicionar esta opção para enviar cookies de autenticação
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const createdQuestion = await response.json();
        setLastCreatedQuestion({
          ...values,
          id: createdQuestion.id
        });
        
        notify.showSuccess('Pergunta opinativa criada com sucesso!');
        
        // Mostrar modal perguntando se deseja criar outra pergunta
        setShowCreateAnotherModal(true);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar pergunta opinativa');
      }
    } catch (error) {
      console.error('Erro ao criar pergunta opinativa:', error);
      notify.showError(`Erro ao criar pergunta opinativa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setShowCreateAnotherModal(false);
    setLoading(false);
  };

  const handleReturnToList = () => {
    setShowCreateAnotherModal(false);
    router.push('/admin/questions');
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
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Pergunta Opinativa</h1>
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
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <OpinionQuestionWizard 
              onSubmit={handleSubmit}
              initialData={lastCreatedQuestion ? {
                text: '', // Novo texto para a nova pergunta
                difficulty: lastCreatedQuestion.difficulty,
                categories: lastCreatedQuestion.categories, // Manter as mesmas categorias
                options: lastCreatedQuestion.options.map((opt: any) => ({
                  ...opt,
                  text: '' // Resetar o texto das opções
                })),
                initialExplanation: lastCreatedQuestion.initialExplanation
              } : undefined}
            />
          )}
        </div>
      </div>

      {/* Modal para perguntar se deseja criar outra pergunta */}
      <Modal
        isOpen={showCreateAnotherModal}
        title="Criar outra pergunta"
        message="Deseja criar outra pergunta opinativa com o mesmo grupo de personalidade/categorias?"
        type="confirm"
        confirmText="Sim, criar outra"
        cancelText="Não, voltar à lista"
        onConfirm={handleCreateAnother}
        onCancel={handleReturnToList}
      />
    </AdminLayout>
  );
};

export default AddOpinionQuestionPage;
