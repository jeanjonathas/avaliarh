import React from 'react';
import LoadingOverlay from '../common/LoadingOverlay';

interface Category {
  id: string;
  name: string;
}

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

interface QuestionStage {
  id: string;
  questionId: string;
  stageId: string;
  order: number;
  question: Question;
}

interface Stage {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
  questionStages?: QuestionStage[];
  questionType?: string;
}

interface TestStage {
  id: string;
  testId: string;
  stageId: string;
  order: number;
  stage: Stage;
}

interface TestStagesListProps {
  testStages: TestStage[];
  stageLoading?: boolean;
  testDataLoading?: boolean;
  editingStageId: string | null;
  editingStageName: string;
  setEditingStageName?: (name: string) => void;
  startEditingStageName: (stageId: string, currentName: string) => void;
  updateStageName: (stageId: string, newName: string) => void;
  cancelEditingStageName: () => void;
  openAddQuestionsModal: (stageId: string) => void;
  handleDeleteStage: (stageId: string) => void;
  removeQuestionFromStage: (stageId: string, questionId: string) => void;
  moveStageToTop: (testStage: TestStage) => void;
  moveStageUp: (testStage: TestStage, index: number) => void;
  moveStageDown: (testStage: TestStage, index: number) => void;
  moveStageToBottom: (testStage: TestStage) => void;
}

const TestStagesList: React.FC<TestStagesListProps> = ({
  testStages,
  stageLoading,
  testDataLoading,
  editingStageId,
  editingStageName,
  setEditingStageName,
  startEditingStageName,
  updateStageName,
  cancelEditingStageName,
  openAddQuestionsModal,
  handleDeleteStage,
  removeQuestionFromStage,
  moveStageToTop,
  moveStageUp,
  moveStageDown,
  moveStageToBottom
}) => {
  return (
    <div className="space-y-6">
      {testDataLoading && (
        <LoadingOverlay 
          isLoading={true} 
          message="Carregando dados do teste..." 
          zIndex={10} 
          comment="Overlay de carregamento para dados do teste" 
        />
      )}
      {testStages
        .sort((a, b) => a.order - b.order)
        .map((testStage, index) => (
          <div key={testStage.id} className="flex items-stretch">
            <div className="bg-white rounded-lg shadow-md overflow-hidden flex-grow relative">
              {/* Overlay de carregamento para operações com etapas */}
              {stageLoading && (
                <LoadingOverlay 
                  isLoading={true} 
                  message="Atualizando etapa..." 
                  zIndex={10} 
                  comment="Overlay de carregamento para operações com etapas" 
                />
              )}
              <div className="bg-secondary-50 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-secondary-800">
                    {index + 1}. {editingStageId === testStage.id ? (
                      <input
                      type="text"
                      value={editingStageName}
                      onChange={(e) => setEditingStageName(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Digite o nome da etapa"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateStageName(testStage.id, editingStageName);
                        } else if (e.key === 'Escape') {
                          cancelEditingStageName();
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center">
                      <span>{testStage.stage.title}</span>
                      {testStage.stage.questionType && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full flex items-center ${
                          testStage.stage.questionType === 'MULTIPLE_CHOICE' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-purple-100 text-purple-800 border border-purple-300'
                        }`}>
                          {testStage.stage.questionType === 'MULTIPLE_CHOICE' ? (
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
                      )}
                      <button 
                        onClick={() => startEditingStageName(testStage.id, testStage.stage.title)}
                        className="ml-2 text-primary-600 hover:text-primary-800 focus:outline-none"
                        title="Editar nome da etapa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </h3>
                {testStage.stage.description && (
                  <p className="mt-1 text-sm text-secondary-600">{testStage.stage.description}</p>
                )}
              </div>
              <div>
                {editingStageId === testStage.id ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateStageName(testStage.id, editingStageName)}
                      className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={cancelEditingStageName}
                      className="px-3 py-1 text-xs text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => openAddQuestionsModal(testStage.stage.id)}
                      className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50 mb-2 block w-full"
                    >
                      Adicionar Perguntas
                    </button>
                    <button
                      onClick={() => handleDeleteStage(testStage.stage.id)}
                      className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-md hover:bg-red-50 block w-full"
                    >
                      Remover Etapa
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <h4 className="text-sm font-medium text-secondary-500 mb-3">
                Perguntas ({testStage.stage.questionStages.length})
              </h4>
              
              {testStage.stage.questionStages.length === 0 ? (
                <div className="text-center py-4 text-secondary-500">
                  <p>Nenhuma pergunta nesta etapa.</p>
                  <button
                    onClick={() => openAddQuestionsModal(testStage.stage.id)}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-800"
                  >
                    Adicionar perguntas
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {testStage.stage.questionStages
                    .sort((a, b) => a.order - b.order)
                    .map((questionStage, qIndex) => (
                      <div key={questionStage.id} className="border border-secondary-200 rounded-md p-4">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium text-secondary-800">
                              <span className="mr-2">{qIndex + 1}.</span>
                              <span dangerouslySetInnerHTML={{ __html: questionStage.question.text }} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                               {/* Exibir a dificuldade corretamente */}
                               <span key={`difficulty-${questionStage.id}`} className={`px-2 py-1 text-xs rounded-full flex items-center ${
                                 questionStage.question.difficulty === 'EASY' 
                                   ? 'bg-green-100 text-green-800 border border-green-300' 
                                   : questionStage.question.difficulty === 'MEDIUM'
                                     ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                     : 'bg-red-100 text-red-800 border border-red-300'
                               }`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                 </svg>
                                 {questionStage.question.difficulty === 'EASY' 
                                   ? 'Fácil' 
                                   : questionStage.question.difficulty === 'MEDIUM' 
                                     ? 'Médio' 
                                     : 'Difícil'}
                               </span>
                               
                               {/* Exibir o tipo de pergunta */}
                               <span key={`type-${questionStage.id}`} className={`px-2 py-1 text-xs rounded-full flex items-center ${
                                 questionStage.question.type === 'MULTIPLE_CHOICE' 
                                   ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                   : 'bg-purple-100 text-purple-800 border border-purple-300'
                               }`}>
                                 {questionStage.question.type === 'MULTIPLE_CHOICE' ? (
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
                               
                               {/* Exibir categorias junto com as outras tags */}
                               {questionStage.question.categories && questionStage.question.categories.map(category => (
                                 <span 
                                   key={`${questionStage.id}-${category.id}`}
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
                          <button
                            onClick={() => removeQuestionFromStage(questionStage.stageId, questionStage.questionId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Botões de reordenação */}
          <div className="ml-4 flex flex-col justify-center">
            <div className="flex flex-col border border-secondary-300 rounded-md overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => moveStageToTop(testStage)}
                title="Mover para o topo"
                className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center"
                disabled={index === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveStageUp(testStage, index)}
                title="Mover para cima"
                className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center border-t border-secondary-300"
                disabled={index === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveStageDown(testStage, index)}
                title="Mover para baixo"
                className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center border-t border-secondary-300"
                disabled={index === testStages.length - 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => moveStageToBottom(testStage)}
                title="Mover para o final"
                className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center border-t border-secondary-300"
                disabled={index === testStages.length - 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TestStagesList;
