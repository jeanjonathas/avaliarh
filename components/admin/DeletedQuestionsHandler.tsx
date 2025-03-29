import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { Question } from '../../types/questions';

interface Stage {
  id: string;
  title: string;
  questions: Question[];
}

interface TestStage {
  id: string;
  stageId: string;
  stage: Stage;
}

interface DeletedQuestionsHandlerProps {
  testId: string;
  testStages?: TestStage[];
  onQuestionsRemoved?: () => void;
}

const DeletedQuestionsHandler: React.FC<DeletedQuestionsHandlerProps> = ({
  testId,
  testStages,
  onQuestionsRemoved
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deletedQuestions, setDeletedQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);

  // Função para verificar perguntas excluídas
  const checkForDeletedQuestions = useCallback(async () => {
    if (!testId || !testStages || testStages.length === 0) {
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      console.log('Verificando perguntas excluídas no teste:', testId);
      
      const foundDeletedQuestions: Question[] = [];
      
      // Para cada etapa do teste, verificar se há perguntas excluídas
      for (const testStage of testStages) {
        if (!testStage.stage || !testStage.stage.questions) continue;
        
        // Obter todos os IDs de perguntas desta etapa
        const questionIds = testStage.stage.questions.map(q => q.id);
        if (questionIds.length === 0) continue;
        
        // Buscar detalhes das perguntas para verificar se alguma está excluída
        const response = await fetch(`/api/admin/questions?ids=${questionIds.join(',')}&includeDeleted=true`);
        if (!response.ok) continue;
        
        const questions = await response.json();
        
        // Verificar se alguma pergunta está marcada como excluída
        const stageDeletedQuestions = questions.filter((q: any) => {
          return q.deleted === true || 
                 q.showResults === false || 
                 (typeof q.text === 'string' && q.text.startsWith('[EXCLUÍDA]'));
        });
        
        if (stageDeletedQuestions.length > 0) {
          console.log(`Encontradas ${stageDeletedQuestions.length} perguntas excluídas na etapa ${testStage.stage.title}`);
          
          // Adicionar informações da etapa às perguntas excluídas
          stageDeletedQuestions.forEach((q: any) => {
            foundDeletedQuestions.push({
              ...q,
              stageName: testStage.stage.title,
              stageId: testStage.stageId
            });
          });
        }
      }
      
      setDeletedQuestions(foundDeletedQuestions);
      
      // Se encontrou perguntas excluídas, abrir o modal automaticamente
      if (foundDeletedQuestions.length > 0) {
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao verificar perguntas excluídas:', error);
    } finally {
      setChecking(false);
    }
  }, [testId, testStages]);

  // Verificar perguntas excluídas quando o componente for montado
  useEffect(() => {
    checkForDeletedQuestions();
  }, [checkForDeletedQuestions]);

  // Função para remover perguntas excluídas do teste
  const removeDeletedQuestions = async () => {
    if (deletedQuestions.length === 0) return;

    try {
      setLoading(true);
      toast.loading('Removendo perguntas excluídas do teste...');

      // Agrupar perguntas por etapa para otimizar as chamadas de API
      const questionsByStage: Record<string, string[]> = {};
      
      deletedQuestions.forEach(question => {
        if (!question.stageId) return;
        
        if (!questionsByStage[question.stageId]) {
          questionsByStage[question.stageId] = [];
        }
        
        questionsByStage[question.stageId].push(question.id);
      });
      
      // Para cada etapa, remover as perguntas excluídas
      const removePromises = Object.entries(questionsByStage).map(async ([stageId, questionIds]) => {
        const response = await fetch(`/api/admin/tests/${testId}/stages/${stageId}/questions`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questionIds }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao remover perguntas');
        }
        
        return response.json();
      });
      
      await Promise.all(removePromises);
      
      toast.success(`${deletedQuestions.length} perguntas excluídas foram removidas do teste`);
      
      // Fechar o modal e notificar o componente pai
      setIsModalOpen(false);
      if (onQuestionsRemoved) {
        onQuestionsRemoved();
      }
    } catch (error) {
      console.error('Erro ao remover perguntas excluídas:', error);
      toast.error('Erro ao remover perguntas excluídas');
    } finally {
      setLoading(false);
      toast.dismiss();
    }
  };

  // Função para visualizar detalhes de uma pergunta
  const viewQuestionDetails = (question: Question) => {
    setSelectedQuestion(question);
    setShowQuestionPreview(true);
  };

  // Renderizar o componente de visualização da pergunta
  const renderQuestionPreview = () => {
    if (!selectedQuestion) return null;

    return (
      <Modal
        isOpen={showQuestionPreview}
        onClose={() => setShowQuestionPreview(false)}
        title="Detalhes da Pergunta"
      >
        <div className="p-4">
          <h3 className="text-lg font-medium text-secondary-900 mb-2">Texto da Pergunta</h3>
          <div className="bg-secondary-50 p-3 rounded-md mb-4">
            <p className="text-secondary-800">{selectedQuestion.text}</p>
          </div>
          
          <h3 className="text-lg font-medium text-secondary-900 mb-2">Alternativas</h3>
          <div className="space-y-2 mb-4">
            {selectedQuestion.options && selectedQuestion.options.length > 0 ? (
              selectedQuestion.options.map((option, index) => (
                <div 
                  key={option.id} 
                  className={`p-3 rounded-md border ${option.isCorrect ? 'border-green-300 bg-green-50' : 'border-secondary-200 bg-white'}`}
                >
                  <div className="flex items-start">
                    <span className="flex-shrink-0 font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-secondary-800">{option.text}</span>
                  </div>
                  {option.isCorrect && (
                    <div className="mt-1 text-sm text-green-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Resposta correta
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-secondary-500 italic">Nenhuma alternativa encontrada</p>
            )}
          </div>
          
          <div className="flex justify-between text-sm text-secondary-500">
            <div>Tipo: {selectedQuestion.type || 'Não especificado'}</div>
            <div>Dificuldade: {selectedQuestion.difficulty || 'Não especificada'}</div>
          </div>
        </div>
      </Modal>
    );
  };

  // Se não houver perguntas excluídas e não estiver verificando, não renderizar nada
  if (deletedQuestions.length === 0 && !checking) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Perguntas Excluídas Detectadas"
      >
        <div className="p-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Este teste contém {deletedQuestions.length} {deletedQuestions.length === 1 ? 'pergunta excluída' : 'perguntas excluídas'}.
                  Recomendamos remover essas perguntas do teste para evitar problemas ao gerar convites.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Perguntas Excluídas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Pergunta
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Etapa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {deletedQuestions.map((question) => (
                    <tr key={question.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900 truncate max-w-xs">
                          {question.text}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-500">
                          {question.stageName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-500">
                          {question.type || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        <button
                          onClick={() => viewQuestionDetails(question)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Visualizar pergunta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Fechar
            </button>
            <button
              onClick={removeDeletedQuestions}
              disabled={loading}
              className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              {loading ? 'Removendo...' : 'Remover Perguntas Excluídas'}
            </button>
          </div>
        </div>
      </Modal>

      {renderQuestionPreview()}
    </>
  );
};

export default DeletedQuestionsHandler;
