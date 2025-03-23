import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, QuestionMarkCircleIcon, DocumentTextIcon, TagIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  tags: string[];
  testCount: number; // número de testes que usam esta questão
  createdAt: string;
}

const QuestionsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Buscar questões
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todas as questões
      axios.get('/api/admin/training/questions')
        .then(response => {
          const questionsData = Array.isArray(response.data) ? response.data : [];
          setQuestions(questionsData);
          setFilteredQuestions(questionsData);
          
          // Extrair todas as tags únicas
          const allTags = questionsData.reduce((tags: string[], question: Question) => {
            question.tags.forEach(tag => {
              if (!tags.includes(tag)) {
                tags.push(tag);
              }
            });
            return tags;
          }, []);
          
          setAvailableTags(allTags.sort());
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar questões:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao buscar as questões.');
          setLoading(false);
        });
    }
  }, [status, router]);

  // Filtrar questões com base nos critérios selecionados
  useEffect(() => {
    let filtered = [...questions];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(question => 
        question.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por tipo
    if (selectedType) {
      filtered = filtered.filter(question => question.type === selectedType);
    }
    
    // Filtrar por dificuldade
    if (selectedDifficulty) {
      filtered = filtered.filter(question => question.difficulty === selectedDifficulty);
    }
    
    // Filtrar por tag
    if (selectedTag) {
      filtered = filtered.filter(question => question.tags.includes(selectedTag));
    }
    
    setFilteredQuestions(filtered);
  }, [questions, searchTerm, selectedType, selectedDifficulty, selectedTag]);

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedDifficulty('');
    setSelectedTag('');
  };

  // Função para obter o texto do tipo de questão
  const getQuestionTypeText = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Múltipla Escolha';
      case 'true_false':
        return 'Verdadeiro/Falso';
      case 'short_answer':
        return 'Resposta Curta';
      case 'essay':
        return 'Dissertativa';
      default:
        return 'Outro';
    }
  };

  // Função para obter o texto da dificuldade
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Média';
      case 'hard':
        return 'Difícil';
      default:
        return 'Não definida';
    }
  };

  // Função para obter a cor da dificuldade
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout activeSection="treinamento">
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-600">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <AdminLayout activeSection="treinamento">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        <ContextualNavigation 
          prevLink={contextualNav.prev} 
          nextLink={contextualNav.next} 
          relatedLinks={contextualNav.related} 
        />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Banco de Questões</h1>
          <Link
            href="/admin/training/questions/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nova Questão
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-800">Filtros</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
              Limpar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por texto */}
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-secondary-700 mb-2">
                Buscar:
              </label>
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite para buscar..."
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Filtro por tipo */}
            <div>
              <label htmlFor="questionType" className="block text-sm font-medium text-secondary-700 mb-2">
                Tipo de Questão:
              </label>
              <select
                id="questionType"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os tipos</option>
                <option value="multiple_choice">Múltipla Escolha</option>
                <option value="true_false">Verdadeiro/Falso</option>
                <option value="short_answer">Resposta Curta</option>
                <option value="essay">Dissertativa</option>
              </select>
            </div>
            
            {/* Filtro por dificuldade */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-secondary-700 mb-2">
                Dificuldade:
              </label>
              <select
                id="difficulty"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todas as dificuldades</option>
                <option value="easy">Fácil</option>
                <option value="medium">Média</option>
                <option value="hard">Difícil</option>
              </select>
            </div>
            
            {/* Filtro por tag */}
            <div>
              <label htmlFor="tag" className="block text-sm font-medium text-secondary-700 mb-2">
                Tag:
              </label>
              <select
                id="tag"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todas as tags</option>
                {availableTags.map((tag, index) => (
                  <option key={index} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <QuestionMarkCircleIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhuma questão encontrada</h2>
            <p className="text-secondary-500 mb-4">
              {questions.length === 0 
                ? 'Não há questões cadastradas no banco de questões.' 
                : 'Nenhuma questão corresponde aos filtros selecionados.'}
            </p>
            <div className="flex justify-center space-x-4">
              {questions.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
                >
                  Limpar Filtros
                </button>
              )}
              <Link
                href="/admin/training/questions/new"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Criar Nova Questão
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Questão
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Dificuldade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Pontos
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {filteredQuestions.map((question) => (
                  <tr key={question.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-secondary-900 line-clamp-2">{question.text}</div>
                      <div className="text-xs text-secondary-500 mt-1">
                        Usada em {question.testCount} {question.testCount === 1 ? 'teste' : 'testes'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-600">{getQuestionTypeText(question.type)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                        {getDifficultyText(question.difficulty)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-600">{question.points}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {question.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/training/questions/${question.id}`}
                        className="text-primary-600 hover:text-primary-800 mr-3"
                      >
                        Visualizar
                      </Link>
                      <Link
                        href={`/admin/training/questions/${question.id}/edit`}
                        className="text-secondary-600 hover:text-secondary-800"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default QuestionsPage;
