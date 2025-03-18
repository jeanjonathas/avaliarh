import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { QuestionType, QuestionDifficulty } from '../../types/questions';
import Link from 'next/link';
import { useNotification } from '../../contexts/NotificationContext';
import QuestionPreview from './QuestionPreview';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  stageId?: string;
  stageName?: string;
  categoryName?: string;
  initialExplanation?: string;
  options: {
    id: string;
    text: string;
    isCorrect?: boolean;
    category?: string;
    weight?: number;
  }[];
}

const QuestionList: React.FC = () => {
  const router = useRouter();
  const { showToast, showModal } = useNotification();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'multiple_choice' | 'opinion'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTest, setFilterTest] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tests, setTests] = useState<{ id: string; title: string }[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
    fetchTests();
  }, [filterType, filterDifficulty, filterCategory, filterTest]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      // Construir os parâmetros de consulta
      const queryParams = new URLSearchParams();
      if (filterType !== 'all') {
        queryParams.append('type', filterType === 'multiple_choice' ? QuestionType.MULTIPLE_CHOICE : QuestionType.OPINION_MULTIPLE);
      }
      if (filterDifficulty !== 'all') {
        queryParams.append('difficulty', filterDifficulty.toUpperCase());
      }
      if (filterCategory !== 'all') {
        queryParams.append('categoryId', filterCategory);
      }
      if (filterTest !== 'all') {
        queryParams.append('testId', filterTest);
      }
      
      const response = await fetch(`/api/admin/questions?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar perguntas');
      }
      const data = await response.json();
      setQuestions(data);
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
      setError('Erro ao carregar perguntas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (!response.ok) {
        throw new Error('Erro ao carregar categorias');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/admin/tests');
      if (!response.ok) {
        throw new Error('Erro ao carregar testes');
      }
      const data = await response.json();
      setTests(data.tests || []);
    } catch (err) {
      console.error('Erro ao buscar testes:', err);
    }
  };

  const handleEdit = (id: string, type: QuestionType) => {
    if (type === QuestionType.OPINION_MULTIPLE) {
      router.push(`/admin/questions/edit-opinion/${id}`);
    } else {
      router.push(`/admin/questions/edit/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    showModal(
      'Excluir Pergunta',
      'Tem certeza que deseja excluir esta pergunta?',
      async () => {
        try {
          const response = await fetch(`/api/admin/questions/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include' // Importante para enviar cookies de sessão
          });

          if (response.ok) {
            // Remover a pergunta da lista
            setQuestions(questions.filter(q => q.id !== id));
            
            // Tentar ler a mensagem de sucesso, se disponível
            try {
              const data = await response.json();
              showToast(data.message || 'Pergunta excluída com sucesso!', 'success');
            } catch (e) {
              // Se não conseguir ler o JSON, usar mensagem padrão
              showToast('Pergunta excluída com sucesso!', 'success');
            }
          } else {
            // Ler o corpo da resposta para obter detalhes do erro
            try {
              const errorData = await response.json();
              showToast(errorData.message || errorData.error || 'Erro ao excluir pergunta', 'error');
            } catch (e) {
              // Se não conseguir ler o JSON, usar mensagem baseada no status HTTP
              if (response.status === 401) {
                showToast('Você precisa estar autenticado para excluir perguntas', 'error');
              } else if (response.status === 403) {
                showToast('Você não tem permissão para excluir perguntas', 'error');
              } else {
                showToast(`Erro ao excluir pergunta (${response.status})`, 'error');
              }
            }
          }
        } catch (err) {
          console.error('Erro ao excluir pergunta:', err);
          showToast('Erro ao excluir pergunta. Tente novamente mais tarde.', 'error');
        }
      },
      { type: 'warning', confirmText: 'Excluir', cancelText: 'Cancelar' }
    );
  };

  const getDifficultyLabel = (difficulty: QuestionDifficulty) => {
    switch (difficulty) {
      case QuestionDifficulty.EASY:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Fácil
          </span>
        );
      case QuestionDifficulty.MEDIUM:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            Médio
          </span>
        );
      case QuestionDifficulty.HARD:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
            Difícil
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            Múltipla Escolha
          </span>
        );
      case QuestionType.OPINION_MULTIPLE:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
            Opinativa
          </span>
        );
      default:
        return null;
    }
  };

  const fetchQuestionDetails = async (id: string) => {
    try {
      setLoadingPreview(true);
      const response = await fetch(`/api/admin/questions/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes da pergunta');
      }
      
      const data = await response.json();
      setPreviewQuestion(data);
    } catch (err) {
      console.error('Erro ao buscar detalhes da pergunta:', err);
      showToast('Erro ao carregar detalhes da pergunta. Tente novamente.', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
          onClick={fetchQuestions}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Pergunta
          </label>
          <select
            id="filterType"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">Todos os tipos</option>
            <option value="multiple_choice">Múltipla Escolha</option>
            <option value="opinion">Opinativa</option>
          </select>
        </div>
        <div>
          <label htmlFor="filterDifficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Dificuldade
          </label>
          <select
            id="filterDifficulty"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as any)}
          >
            <option value="all">Todas as dificuldades</option>
            <option value="easy">Fácil</option>
            <option value="medium">Médio</option>
            <option value="hard">Difícil</option>
          </select>
        </div>
        <div>
          <label htmlFor="filterCategory" className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <select
            id="filterCategory"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterTest" className="block text-sm font-medium text-gray-700 mb-1">
            Teste
          </label>
          <select
            id="filterTest"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterTest}
            onChange={(e) => setFilterTest(e.target.value)}
          >
            <option value="all">Todos os testes</option>
            {tests.map((test) => (
              <option key={test.id} value={test.id}>
                {test.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de perguntas */}
      {questions.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma pergunta encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comece adicionando uma nova pergunta ou ajuste os filtros.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pergunta
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dificuldade
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="text-sm font-medium text-gray-900"
                      dangerouslySetInnerHTML={{ __html: question.text }}
                    />
                    {question.stageName && (
                      <div className="text-xs text-gray-500">Etapa: {question.stageName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeLabel(question.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDifficultyLabel(question.difficulty)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{question.categoryName || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => fetchQuestionDetails(question.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Visualizar
                    </button>
                    <button
                      onClick={() => handleEdit(question.id, question.type)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal de visualização da pergunta */}
      {previewQuestion && (
        <QuestionPreview
          question={previewQuestion}
          onClose={() => setPreviewQuestion(null)}
        />
      )}
      
      {/* Indicador de carregamento para visualização */}
      {loadingPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            <p className="text-gray-700">Carregando detalhes da pergunta...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionList;
