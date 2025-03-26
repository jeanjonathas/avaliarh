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
  toggleMultipleQuestions: (questionIds: string[], select: boolean) => void;
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
  toggleMultipleQuestions,
  questionLoading,
  availableCategories,
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  filteredQuestions,
  onCreateNewQuestion
}) => {
  if (!isOpen) return null;

  // Verificar se todas as perguntas filtradas estão selecionadas
  const areAllQuestionsSelected = filteredQuestions.length > 0 && 
    filteredQuestions.every(question => selectedQuestions.includes(question.id));
  
  // Função para selecionar ou desmarcar todas as perguntas filtradas
  const toggleAllQuestions = () => {
    // Obter todos os IDs das perguntas filtradas
    const filteredIds = filteredQuestions.map(q => q.id);
    
    // Verificar se todas as perguntas filtradas estão selecionadas
    if (areAllQuestionsSelected) {
      // Se todas estão selecionadas, desmarcar todas
      toggleMultipleQuestions(filteredIds, false);
    } else {
      // Se nem todas estão selecionadas, selecionar todas
      toggleMultipleQuestions(filteredIds, true);
    }
  };
  
  // Mapear as opções de dificuldade para exibição
  const difficultyOptions = [
    { value: '', label: 'Todas as dificuldades' },
    { value: 'EASY', label: 'Fácil' },
    { value: 'MEDIUM', label: 'Médio' },
    { value: 'HARD', label: 'Difícil' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-screen">
        {/* Cabeçalho do modal */}
        <div className="p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-800">Adicionar Perguntas</h2>
          <p className="text-sm text-secondary-500 mt-1">
            Selecione as perguntas que deseja adicionar à etapa do teste.
          </p>
        </div>
        
        {/* Conteúdo do modal com altura limitada e rolagem */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filtros - fixos no topo */}
          <div className="p-6 border-b border-secondary-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro de categoria */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-secondary-700 mb-1">
                  Filtrar por Categoria
                </label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todas as categorias</option>
                  {availableCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtro de dificuldade */}
              <div>
                <label htmlFor="difficulty-filter" className="block text-sm font-medium text-secondary-700 mb-1">
                  Filtrar por Dificuldade
                </label>
                <select
                  id="difficulty-filter"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {difficultyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Seletor de todas as perguntas - fixo abaixo dos filtros */}
          <div className="px-6 py-3 border-b border-secondary-200">
            <div 
              className="cursor-pointer flex items-center" 
              onClick={toggleAllQuestions}
              title={areAllQuestionsSelected ? "Desmarcar todas" : "Selecionar todas"}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                areAllQuestionsSelected 
                  ? 'bg-primary-600 border-primary-600' 
                  : 'border-secondary-300'
              }`}>
                {areAllQuestionsSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <span className="ml-2 text-sm text-secondary-700">
                {areAllQuestionsSelected ? "Desmarcar todas" : "Selecionar todas"}
              </span>
            </div>
          </div>
          
          {/* Lista de perguntas com rolagem */}
          <div className="flex-1 overflow-y-auto p-6 relative">
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
              <div className="space-y-4">
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
                    <div className="flex">
                      <div className="mr-3 mt-1">
                        <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                          selectedQuestions.includes(question.id) 
                            ? 'bg-primary-600 border-primary-600' 
                            : 'border-secondary-300'
                        }`}>
                          {selectedQuestions.includes(question.id) && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
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
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Rodapé fixo com contador e botões */}
          <div className="p-6 border-t border-secondary-200 bg-white">
            <div className="flex justify-between items-center">
              <div>
                {onCreateNewQuestion && (
                  <button
                    onClick={onCreateNewQuestion}
                    className="px-4 py-2 text-sm text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50"
                  >
                    Criar Nova Pergunta
                  </button>
                )}
              </div>
              
              {/* Contador centralizado */}
              <div className="bg-gray-100 px-4 py-2 rounded-md text-secondary-700 flex items-center mx-auto">
                <span className="font-medium">{selectedQuestions.length}</span>
                <span className="ml-1">{selectedQuestions.length === 1 ? 'pergunta selecionada' : 'perguntas selecionadas'}</span>
                <span className="mx-1">de</span>
                <span className="font-medium">{filteredQuestions.length}</span>
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
                  className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  disabled={selectedQuestions.length === 0}
                >
                  Adicionar {selectedQuestions.length} {selectedQuestions.length === 1 ? 'Pergunta' : 'Perguntas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionsModal;
