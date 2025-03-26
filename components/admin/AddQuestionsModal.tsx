import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  text: string;
  options: any[];
  categoryId?: string;
  categoryName?: string;
  categories?: Category[];
  difficulty?: string;
  type?: string;
}

interface Category {
  id: string;
  name: string;
}

interface AddQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
  availableQuestions: Question[];
  selectedQuestions: string[];
  toggleQuestionSelection: (questionId: string) => void;
  questionLoading: boolean;
  availableCategories: Category[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;
  filteredQuestions: Question[];
  onCreateNewQuestion?: () => void;
}

const AddQuestionsModal: React.FC<AddQuestionsModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  availableQuestions,
  selectedQuestions,
  toggleQuestionSelection,
  questionLoading,
  availableCategories,
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  filteredQuestions,
  onCreateNewQuestion
}) => {
  // Estado local para rastrear se o componente foi montado
  const [isMounted, setIsMounted] = useState(false);
  
  // Efeito para marcar o componente como montado
  useEffect(() => {
    setIsMounted(true);
    
    // Log das categorias disponíveis quando o componente é montado
    if (availableCategories && availableCategories.length > 0) {
      console.log('[AddQuestionsModal] Categorias disponíveis:', availableCategories.map(c => `${c.id}: ${c.name}`).join(', '));
    } else {
      console.log('[AddQuestionsModal] Nenhuma categoria disponível');
    }
    
    // Cleanup quando o componente for desmontado
    return () => {
      setIsMounted(false);
    };
  }, [availableCategories]);
  
  // Log quando o filtro de categoria é alterado
  useEffect(() => {
    if (isMounted) {
      console.log('[AddQuestionsModal] Categoria selecionada alterada para:', selectedCategory);
    }
  }, [selectedCategory, isMounted]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">
          Adicionar Perguntas à Etapa
        </h2>
        
        <div className="flex justify-between mb-4">
          <div className="w-64">
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-secondary-700 mb-1">
              Filtrar por Categoria
            </label>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md"
            >
              <option value="all">Todas as categorias</option>
              {availableCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-64">
            <label htmlFor="difficultyFilter" className="block text-sm font-medium text-secondary-700 mb-1">
              Filtrar por Dificuldade
            </label>
            <select
              id="difficultyFilter"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md"
            >
              <option value="all">Todas as dificuldades</option>
              <option value="EASY">Fácil</option>
              <option value="MEDIUM">Médio</option>
              <option value="HARD">Difícil</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 mb-4 border border-secondary-200 rounded-md relative">
          {/* Overlay de carregamento para operações com perguntas */}
          {questionLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center">
              <div className="flex items-center rounded-lg p-3 bg-white shadow-md">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
                <span className="text-sm text-gray-700">Processando perguntas...</span>
              </div>
            </div>
          )}
          {filteredQuestions.length === 0 ? (
            <div className="p-6 text-center text-secondary-500">
              Nenhuma pergunta encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredQuestions.map((question, index) => (
                <div 
                  key={question.id}
                  className={`p-4 border rounded-md ${
                    selectedQuestions.includes(question.id)
                      ? 'bg-primary-50 border-primary-500' 
                      : 'border-secondary-200 hover:border-secondary-400'
                  }`}
                  onClick={() => toggleQuestionSelection(question.id)}
                >
                  <div>
                    <div className="font-medium text-secondary-800">
                      <span className="mr-2">{index + 1}.</span>
                      <span dangerouslySetInnerHTML={{ __html: question.text }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* Exibir a dificuldade corretamente */}
                      <span key={`difficulty-${question.id}`} className={`px-2 py-1 text-xs rounded-full flex items-center ${
                        question.difficulty === 'EASY' 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : question.difficulty === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {question.difficulty === 'EASY' 
                          ? 'Fácil' 
                          : question.difficulty === 'MEDIUM' 
                            ? 'Médio' 
                            : 'Difícil'}
                      </span>
                      
                      {/* Exibir o tipo de pergunta */}
                      <span key={`type-${question.id}`} className={`px-2 py-1 text-xs rounded-full flex items-center ${
                        question.type === 'MULTIPLE_CHOICE' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-purple-100 text-purple-800 border border-purple-300'
                      }`}>
                        {question.type === 'MULTIPLE_CHOICE' ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Múltipla Escolha</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <span>Opinativa</span>
                          </>
                        )}
                      </span>
                      
                      {/* Exibir categorias */}
                      {question.categories && question.categories.map(category => (
                        <span 
                          key={`${question.id}-${category.id}`}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-full flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-secondary-600">
              {selectedQuestions.length} {selectedQuestions.length === 1 ? 'pergunta selecionada' : 'perguntas selecionadas'}
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
            >
              Cancelar
            </button>
            <button
              onClick={onAdd}
              disabled={selectedQuestions.length === 0}
              className={`px-4 py-2 text-sm text-white rounded-md ${
                selectedQuestions.length === 0
                  ? 'bg-primary-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              Adicionar {selectedQuestions.length} pergunta(s)
            </button>
            {onCreateNewQuestion && (
              <button
                onClick={onCreateNewQuestion}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Criar Nova Pergunta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionsModal;
