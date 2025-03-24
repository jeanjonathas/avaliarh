import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../../../components/admin/AdminLayout';
import { useNotificationSystem } from '../../../../hooks/useNotificationSystem';
import OpinionQuestionWizard from '../../../../components/admin/OpinionQuestionWizard';
import Modal from '../../../../components/ui/Modal';

const EditOpinionQuestionPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const notify = useNotificationSystem();
  const [loading, setLoading] = useState(true);
  const [questionData, setQuestionData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const hasLoadedDataRef = useRef(false);

  const fetchQuestionData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados da pergunta');
      }

      const data = await response.json();
      console.log('Dados recebidos da API:', data);
      
      // Verificar se é uma pergunta opinativa
      if (data.type !== 'OPINION_MULTIPLE') {
        notify.showError('Esta não é uma pergunta opinativa. Redirecionando...');
        router.push('/admin/questions');
        return;
      }
      
      // Extrair categorias únicas das opções
      const uniqueCategories = Array.from(
        new Set(
          data.options
            .filter((option: any) => option.category)
            .map((option: any) => option.category)
        )
      ).map((categoryName: string) => {
        // Encontrar o UUID correspondente para esta categoria
        const option = data.options.find((opt: any) => opt.category === categoryName);
        return {
          name: categoryName,
          uuid: option?.categoryNameUuid || ''
        };
      });
      
      // Adaptar os dados para o formato esperado pelo OpinionQuestionWizard
      const adaptedData = {
        ...data,
        // Usar as categorias extraídas das opções
        categories: uniqueCategories,
        // Adaptar as opções para o formato esperado
        options: data.options.map((option: any) => ({
          id: option.id,
          text: option.text,
          category: option.categoryName,
          categoryNameUuid: option.categoryNameUuid,
          weight: option.weight || 1,
          isCorrect: true
        })),
        // Se temos um opinionGroup, incluímos seu ID
        opinionGroupId: data.opinionGroup?.id
      };
      
      console.log('Dados adaptados para o wizard:', adaptedData);
      setQuestionData(adaptedData);
      hasLoadedDataRef.current = true;
    } catch (error) {
      console.error('Erro ao buscar dados da pergunta:', error);
      notify.showError(`Erro ao buscar dados da pergunta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      router.push('/admin/questions');
    } finally {
      setLoading(false);
    }
  }, [id, notify, router]);

  useEffect(() => {
    // Verificar autenticação
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    // Verificar se já carregamos os dados para evitar loop infinito
    if (hasLoadedDataRef.current) {
      console.log("Dados já foram carregados anteriormente, ignorando chamada");
      return;
    }
    
    // Verificar se temos o ID da pergunta
    if (status === 'authenticated' && id) {
      console.log("Iniciando carregamento dos dados da pergunta:", id);
      fetchQuestionData();
    }
  }, [status, router, id, fetchQuestionData]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notify.showSuccess('Pergunta opinativa atualizada com sucesso!');
        setShowSuccessModal(true);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar pergunta opinativa');
      }
    } catch (error) {
      console.error('Erro ao atualizar pergunta opinativa:', error);
      notify.showError(`Erro ao atualizar pergunta opinativa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/questions');
  };

  if (loading && !hasLoadedDataRef.current) {
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
          <h1 className="text-2xl font-bold text-gray-800">Editar Pergunta Opinativa</h1>
        </div>

        {questionData && (
          <OpinionQuestionWizard 
            onSubmit={handleSubmit} 
            onCancel={handleCancel}
            initialData={questionData}
            isEditing={true}
          />
        )}

        <Modal
          isOpen={showSuccessModal}
          onClose={() => router.push('/admin/questions')}
          title="Pergunta Atualizada"
        >
          <div className="p-4">
            <p className="text-gray-600 mb-4">A pergunta foi atualizada com sucesso!</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => router.push('/admin/questions')}
                className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                Voltar para Lista
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default EditOpinionQuestionPage;
