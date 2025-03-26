import React from 'react';
import QuestionForm from './QuestionForm';
import { QuestionType } from '../../types/questions';

interface NewQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  onSuccess: () => void;
  stages: any[];
  categories: any[];
  selectedStageId: string | null;
  selectedQuestionType: string;
}

const NewQuestionModal: React.FC<NewQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
  stages,
  categories,
  selectedStageId,
  selectedQuestionType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-auto my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-800">Adicionar Pergunta de Múltipla Escolha</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[70vh]">
          <QuestionForm
            stages={stages}
            categories={categories}
            preSelectedStageId={selectedStageId || undefined}
            onSubmit={onSubmit}
            onCancel={onClose}
            onSuccess={onSuccess}
            hideStageField={true}
            initialValues={{
              type: selectedQuestionType || QuestionType.MULTIPLE_CHOICE,
              text: '',
              options: [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
              ],
              difficulty: 'MEDIUM'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NewQuestionModal;
