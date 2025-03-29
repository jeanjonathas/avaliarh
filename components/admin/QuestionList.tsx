import React, { useState, useEffect, useCallback } from 'react';
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
  deleted?: boolean;
  options: {
    id: string;
    text: string;
    isCorrect?: boolean;
    category?: string;
    weight?: number;
  }[];
}

interface QuestionListProps {
  apiEndpoint?: string;
  questionType?: string;
}

const QuestionList: React.FC<QuestionListProps> = ({ 
  apiEndpoint = '/api/admin/questions',
  questionType = 'selection'
}) => {
  const router = useRouter();
  const { showToast, showModal } = useNotification();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'multiple_choice' | 'opinion'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTest, setFilterTest] = useState<string>('all');
  const [filterDeleted, setFilterDeleted] = useState<'all' | 'active' | 'deleted'>('active');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tests, setTests] = useState<{ id: string; title: string }[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchQuestions = useCallback(async () => {
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
      if (filterDeleted !== 'all') {
        queryParams.append('deleted', filterDeleted === 'deleted' ? 'true' : 'false');
      }
      
      // Adicionar parâmetros de paginação
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', itemsPerPage.toString());
      
      const response = await fetch(`${apiEndpoint}?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar perguntas');
      }
      const data = await response.json();
      
      // Verificar se a resposta contém informações de paginação
      if (data.items && data.totalItems !== undefined) {
        setQuestions(data.items);
        setTotalItems(data.totalItems);
      } else {
        // Fallback para o formato antigo de resposta (sem paginação)
        setQuestions(data);
        setTotalItems(data.length);
      }
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
      setError('Erro ao carregar perguntas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDifficulty, filterCategory, filterTest, filterDeleted, apiEndpoint, currentPage, itemsPerPage]);

  const fetchCategories = useCallback(async () => {
    try {
      // Determinar o endpoint correto para categorias com base no tipo de questão
      const categoriesEndpoint = questionType === 'training' 
        ? '/api/admin/training/categories' 
        : '/api/admin/categories';
      
      const response = await fetch(categoriesEndpoint);
      if (!response.ok) {
        throw new Error('Erro ao carregar categorias');
      }
      
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      setError('Falha ao carregar categorias');
    }
  }, [questionType]);

  const fetchTests = useCallback(async () => {
    try {
      // Determinar o endpoint correto para testes com base no tipo de questão
      const testsEndpoint = questionType === 'training' 
        ? '/api/admin/training/courses' 
        : '/api/admin/tests';
      
      const response = await fetch(testsEndpoint);
      if (!response.ok) {
        throw new Error('Erro ao carregar testes');
      }
      
      const data = await response.json();
      // Verificar se a resposta contém um array de testes ou se está em uma propriedade
      if (data.tests && Array.isArray(data.tests)) {
        setTests(data.tests);
      } else if (Array.isArray(data)) {
        setTests(data);
      } else {
        console.error('Formato de resposta inesperado:', data);
        setTests([]);
      }
    } catch (error) {
      console.error('Erro ao buscar testes:', error);
      setError('Falha ao carregar testes');
      setTests([]);
    }
  }, [questionType]);

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
    fetchTests();
  }, [fetchQuestions, fetchCategories, fetchTests]);

  // Função para mudar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Função para mudar o número de itens por página
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Voltar para a primeira página ao mudar o número de itens por página
  };

  // Calcular o número total de páginas
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleEditQuestion = (id: string) => {
    // Determinar a URL de edição com base no tipo de questão
    if (questionType === 'training') {
      // Para questões de treinamento
      const question = questions.find(q => q.id === id);
      if (question?.type === QuestionType.OPINION_MULTIPLE) {
        router.push(`/admin/training/questions/edit-opinion/${id}`);
      } else {
        router.push(`/admin/training/questions/edit/${id}`);
      }
    } else {
      // Para questões de seleção
      const question = questions.find(q => q.id === id);
      if (question?.type === QuestionType.OPINION_MULTIPLE) {
        router.push(`/admin/questions/edit-opinion/${id}`);
      } else {
        router.push(`/admin/questions/edit/${id}`);
      }
    }
  };

  const handleDelete = (id: string) => {
    showModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta pergunta?',
      async () => {
        try {
          const response = await fetch(`${apiEndpoint}/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Erro ao excluir pergunta');
          }

          // Atualizar a lista após exclusão bem-sucedida
          fetchQuestions();
          showToast('Pergunta excluída com sucesso', 'success');
        } catch (error) {
          console.error('Erro ao excluir pergunta:', error);
          showToast('Erro ao excluir pergunta', 'error');
        }
      }
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
      const response = await fetch(`${apiEndpoint}/${id}`);
      
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
        <div>
          <label htmlFor="filterDeleted" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="filterDeleted"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterDeleted}
            onChange={(e) => setFilterDeleted(e.target.value as any)}
          >
            <option value="active">Ativas</option>
            <option value="deleted">Excluídas</option>
            <option value="all">Todas</option>
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
        <div>
          <div className="overflow-x-auto -mx-6 md:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pergunta
                  </th>
                  <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Tipo
                  </th>
                  <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Dificuldade
                  </th>
                  <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Categoria
                  </th>
                  <th scope="col" className="px-3 md:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questions.map((question) => (
                  <tr key={question.id} className={question.deleted ? "bg-red-50" : ""}>
                    <td className="px-3 md:px-6 py-4">
                      <div 
                        className={`text-sm font-medium ${question.deleted ? "text-gray-500 line-through" : "text-gray-900"} line-clamp-2`}
                        dangerouslySetInnerHTML={{ __html: question.text }}
                      />
                      {question.stageName && (
                        <div className="text-xs text-gray-500">Etapa: {question.stageName}</div>
                      )}
                      {question.deleted && (
                        <div className="text-xs text-red-500 mt-1">Excluída</div>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-4 hidden sm:table-cell">
                      {getTypeLabel(question.type)}
                    </td>
                    <td className="px-3 md:px-6 py-4 hidden sm:table-cell">
                      {getDifficultyLabel(question.difficulty)}
                    </td>
                    <td className="px-3 md:px-6 py-4 hidden md:table-cell">
                      <div className="text-sm text-gray-900">{question.categoryName || '-'}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-2 sm:gap-4">
                        <button
                          onClick={() => fetchQuestionDetails(question.id)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                          aria-label="Visualizar"
                        >
                          <span className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            <span className="hidden sm:inline">Visualizar</span>
                          </span>
                        </button>
                        <button
                          onClick={() => handleEditQuestion(question.id)}
                          className="text-primary-600 hover:text-primary-900 text-sm"
                          aria-label="Editar"
                        >
                          <span className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            <span className="hidden sm:inline">Editar</span>
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                          aria-label="Excluir"
                        >
                          <span className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="hidden sm:inline">Excluir</span>
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Controles de paginação */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-4 sm:mb-0">
              <span className="text-sm text-gray-700 mr-4">
                Itens por página:
              </span>
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-4 text-sm text-gray-700">
                Mostrando {questions.length} de {totalItems} itens
              </span>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-l-md border ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                <span className="sr-only">Primeira página</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M7.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L3.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 border-t border-b ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                <span className="sr-only">Página anterior</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Números de página */}
              <div className="hidden sm:flex">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  
                  // Mostrar apenas um número limitado de páginas
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-1 border-t border-b ${
                          currentPage === pageNumber
                            ? 'bg-primary-100 text-primary-700 font-medium'
                            : 'bg-white text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  }
                  
                  // Mostrar reticências para páginas omitidas
                  if (
                    (pageNumber === 2 && currentPage > 3) ||
                    (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <span
                        key={pageNumber}
                        className="px-3 py-1 border-t border-b bg-white text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  
                  return null;
                })}
              </div>
              
              {/* Versão móvel: apenas página atual/total */}
              <div className="flex sm:hidden">
                <span className="px-3 py-1 border-t border-b bg-white text-gray-700">
                  {currentPage} / {totalPages}
                </span>
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 border-t border-b ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                <span className="sr-only">Próxima página</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-r-md border ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                <span className="sr-only">Última página</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M12.293 15.707a1 1 0 010-1.414L16.586 10l-4.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
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
