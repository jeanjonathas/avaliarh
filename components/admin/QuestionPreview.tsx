import React from 'react';
import { QuestionType, QuestionDifficulty } from '../../types/questions';

interface QuestionPreviewProps {
  question: {
    id: string;
    text: string;
    type: QuestionType;
    difficulty: QuestionDifficulty;
    initialExplanation?: string;
    options: {
      id: string;
      text: string;
      isCorrect?: boolean;
      category?: string;
      weight?: number;
    }[];
  };
  onClose: () => void;
}

const QuestionPreview: React.FC<QuestionPreviewProps> = ({ question, onClose }) => {
  const isMultipleChoice = question.type === QuestionType.MULTIPLE_CHOICE;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Prévia da Pergunta
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Fechar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tipo da pergunta */}
          <div className="mb-4">
            <span className={`px-2 py-1 text-xs rounded-full ${
              isMultipleChoice 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-purple-100 text-purple-800'
            }`}>
              {isMultipleChoice ? 'Múltipla Escolha' : 'Opinativa'}
            </span>
          </div>
          
          {/* Explicação inicial (se existir) */}
          {question.initialExplanation && (
            <div className="mb-4 p-3 bg-gray-50 border-l-4 border-blue-500 text-sm">
              <h3 className="font-medium text-gray-700 mb-1">Explicação Inicial:</h3>
              <p>{question.initialExplanation}</p>
            </div>
          )}
          
          {/* Texto da pergunta */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Pergunta:</h3>
            <div 
              className="text-gray-900 text-lg"
              dangerouslySetInnerHTML={{ __html: question.text }}
            />
          </div>
          
          {/* Opções */}
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Opções:</h3>
            
            {isMultipleChoice ? (
              // Exibição para perguntas de múltipla escolha
              <div className="space-y-3">
                {question.options.map((option) => (
                  <div 
                    key={option.id} 
                    className={`p-3 border rounded-lg ${
                      option.isCorrect 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-grow">
                        <p className="text-gray-800">{option.text}</p>
                        
                        {/* Indicador de resposta correta para múltipla escolha */}
                        {option.isCorrect && (
                          <div className="mt-2 flex items-center text-green-600 text-sm">
                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Resposta correta
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Exibição para perguntas opinativas em formato de tabela
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personalidade / Perfil
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Texto da Alternativa
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {question.options.map((option) => (
                      <tr key={option.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {option.category || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{option.text}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{option.weight || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionPreview;
