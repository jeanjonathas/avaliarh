import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../../../components/admin/AdminLayout';
import QuestionForm from '../../../../components/admin/QuestionForm';
import { Button } from '../../../../components/ui/Button';
import { useNotificationSystem } from '../../../../hooks/useNotificationSystem';
import Breadcrumbs, { useBreadcrumbs } from '../../../../components/admin/Breadcrumbs';

const AddTrainingQuestionPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const notify = useNotificationSystem();
  const breadcrumbItems = useBreadcrumbs();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dataFetched, setDataFetched] = useState(false); // Flag para controlar se os dados já foram buscados

  // Carregar categorias
  useEffect(() => {
    // Evitar múltiplas chamadas de API
    if (dataFetched || status !== 'authenticated') return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Carregar categorias de treinamento
        let categoriesData = [];
        try {
          console.log('Buscando categorias de treinamento...');
          const categoriesResponse = await fetch('/api/admin/training/categories');
          if (categoriesResponse.ok) {
            categoriesData = await categoriesResponse.json();
            console.log(`Encontradas ${categoriesData.length} categorias de treinamento`);
          } else {
            console.error('Erro ao carregar categorias de treinamento:', categoriesResponse.statusText);
            categoriesData = [];
          }
        } catch (categoryError) {
          console.error('Erro ao carregar categorias de treinamento:', categoryError);
          categoriesData = [];
        }
        setCategories(categoriesData);
        
        setLoading(false);
        setDataFetched(true); // Marcar que os dados foram buscados
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(true);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [status, dataFetched]);

  const handleCancel = () => {
    router.push('/admin/training/questions');
  };

  const handleSubmit = async (values: any) => {
    try {
      // Adicionar tipo de questão como "training"
      const questionData = {
        ...values,
        questionType: 'training'
      };

      const response = await fetch('/api/admin/training/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (response.ok) {
        notify.showSuccess('Pergunta de treinamento criada com sucesso!');
        router.push('/admin/training/questions');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar pergunta de treinamento');
      }
    } catch (error) {
      console.error('Erro ao criar pergunta de treinamento:', error);
      notify.showError(`Erro ao criar pergunta de treinamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Verificar autenticação
  if (status === 'unauthenticated') {
    router.push('/admin/login');
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
        <Breadcrumbs items={breadcrumbItems} />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Pergunta de Treinamento</h1>
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
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Ocorreu um erro ao carregar os dados necessários para o formulário.</p>
              <Button 
                variant="primary" 
                onClick={() => {
                  setDataFetched(false); // Resetar a flag para permitir nova tentativa
                  window.location.reload();
                }}
                className="mx-auto"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <QuestionForm 
              onSubmit={handleSubmit}
              isEditing={false}
              categories={categories || []}
              questionType="training"
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddTrainingQuestionPage;
