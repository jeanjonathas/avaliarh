import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/AdminLayout';
import QuestionForm from '../../../../components/admin/QuestionForm';
import { useNotification } from '../../../../contexts/NotificationContext';
import { QuestionType, QuestionDifficulty } from '../../../../types/questions';

const EditQuestionPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { showToast, showModal } = useNotification();
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        try {
          const [questionResponse, categoriesResponse] = await Promise.all([
            fetch(`/api/admin/questions/${id}`, {
              credentials: 'include'
            }),
            fetch('/api/admin/categories')
          ]);

          if (!questionResponse.ok) {
            const errorData = await questionResponse.json();
            throw new Error(errorData.message || errorData.error || `Erro ao buscar pergunta: ${questionResponse.status}`);
          }
          const questionData = await questionResponse.json();
          console.log('Dados da pergunta recebidos da API:', questionData);
          console.log('Opções recebidas:', questionData.options);
          setQuestion(questionData);

          if (!categoriesResponse.ok) {
            console.error('Erro ao carregar categorias:', categoriesResponse.status);
          } else {
            const categoriesData = await categoriesResponse.json();
            console.log('Categorias recebidas:', categoriesData);
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
          }

          setError(null);
        } catch (err: any) {
          console.error('Erro ao carregar dados:', err);
          setError(err.message || 'Erro ao carregar os dados');
          showToast(err.message || 'Erro ao carregar os dados', 'error');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [id, showToast]);

  const handleSubmit = async (values: any) => {
    try {
      showModal(
        'Salvar Alterações',
        'Tem certeza que deseja salvar as alterações nesta pergunta?',
        async () => {
          try {
            const response = await fetch(`/api/admin/questions/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(values),
              credentials: 'include'
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || errorData.error || `Erro ao atualizar pergunta: ${response.status}`);
            }

            const data = await response.json();
            showToast('Pergunta atualizada com sucesso!', 'success');
            router.push('/admin/questions');
          } catch (err: any) {
            console.error('Erro ao atualizar pergunta:', err);
            showToast(err.message || 'Erro ao atualizar pergunta', 'error');
          }
        },
        { type: 'confirm', confirmText: 'Salvar', cancelText: 'Cancelar' }
      );
    } catch (err: any) {
      console.error('Erro ao processar formulário:', err);
      showToast(err.message || 'Erro ao processar formulário', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Editar Pergunta</h1>
          <button
            onClick={() => router.push('/admin/questions')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Voltar
          </button>
        </div>

        {loading ? (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const loadData = async () => {
                  setLoading(true);
                  try {
                    const [questionResponse, categoriesResponse] = await Promise.all([
                      fetch(`/api/admin/questions/${id}`, {
                        credentials: 'include'
                      }),
                      fetch('/api/admin/categories')
                    ]);

                    if (!questionResponse.ok) {
                      const errorData = await questionResponse.json();
                      throw new Error(errorData.message || errorData.error || `Erro ao buscar pergunta: ${questionResponse.status}`);
                    }
                    const questionData = await questionResponse.json();
                    console.log('Dados da pergunta recebidos da API:', questionData);
                    console.log('Opções recebidas:', questionData.options);
                    setQuestion(questionData);

                    if (!categoriesResponse.ok) {
                      console.error('Erro ao carregar categorias:', categoriesResponse.status);
                    } else {
                      const categoriesData = await categoriesResponse.json();
                      console.log('Categorias recebidas:', categoriesData);
                      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
                    }

                    setError(null);
                  } catch (err: any) {
                    console.error('Erro ao carregar dados:', err);
                    setError(err.message || 'Erro ao carregar os dados');
                    showToast(err.message || 'Erro ao carregar os dados', 'error');
                  } finally {
                    setLoading(false);
                  }
                };

                loadData();
              }}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : question ? (
          <div className="bg-white shadow-md rounded-lg p-6">
            <QuestionForm
              onSubmit={handleSubmit}
              isEditing={true}
              initialValues={question}
              categories={categories}
            />
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-center text-gray-500">Pergunta não encontrada</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default EditQuestionPage;
