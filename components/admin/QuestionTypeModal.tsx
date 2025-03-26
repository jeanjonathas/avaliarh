import React from 'react';
import { useRouter } from 'next/router';
import { QuestionType } from '../../types/questions';

interface QuestionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMultipleChoice: () => void;
  selectedStageId: string | null;
}

const QuestionTypeModal: React.FC<QuestionTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectMultipleChoice,
  selectedStageId
}) => {
  const router = useRouter();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Escolha o Tipo de Pergunta</h2>
        
        <div className="space-y-4">
          <div 
            className="p-4 border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors flex items-center"
            onClick={onSelectMultipleChoice}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Múltipla Escolha</h3>
              <p className="text-sm text-gray-600">Pergunta com uma única resposta correta</p>
            </div>
          </div>
          
          <div 
            className="p-4 border border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors flex items-center"
            onClick={() => {
              onClose();
              // Redirecionar para a página de criação de perguntas opinativas
              router.push({
                pathname: '/admin/questions/add-opinion',
                query: { stageId: selectedStageId }
              });
            }}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Opinativa</h3>
              <p className="text-sm text-gray-600">Avalia o perfil e personalidade do candidato</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionTypeModal;
