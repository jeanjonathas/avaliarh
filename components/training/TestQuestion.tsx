import React from 'react';
import { FiCheckCircle, FiXCircle, FiHelpCircle } from 'react-icons/fi';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SINGLE_CHOICE';
  options: QuestionOption[];
}

interface TestQuestionProps {
  question: Question;
  selectedOptions: string[];
  onSelectOption: (optionId: string) => void;
  showFeedback?: boolean;
  correctOptions?: string[];
}

const TestQuestion: React.FC<TestQuestionProps> = ({
  question,
  selectedOptions,
  onSelectOption,
  showFeedback = false,
  correctOptions = [],
}) => {
  const isMultipleChoice = question.type === 'MULTIPLE_CHOICE';
  
  const handleOptionClick = (optionId: string) => {
    if (showFeedback) return; // Não permitir alterações após submissão
    onSelectOption(optionId);
  };
  
  const getOptionStatus = (optionId: string) => {
    if (!showFeedback) return 'neutral';
    
    const isSelected = selectedOptions.includes(optionId);
    const isCorrect = correctOptions.includes(optionId);
    
    if (isSelected && isCorrect) return 'correct';
    if (isSelected && !isCorrect) return 'incorrect';
    if (!isSelected && isCorrect) return 'missed';
    return 'neutral';
  };
  
  const getOptionClasses = (status: string) => {
    const baseClasses = "p-4 border rounded-lg mb-3 flex items-start cursor-pointer transition-all";
    
    switch (status) {
      case 'correct':
        return `${baseClasses} border-green-500 bg-green-50 text-green-800`;
      case 'incorrect':
        return `${baseClasses} border-red-500 bg-red-50 text-red-800`;
      case 'missed':
        return `${baseClasses} border-yellow-500 bg-yellow-50 text-yellow-800`;
      default:
        return `${baseClasses} border-secondary-200 hover:border-primary-500 hover:bg-primary-50`;
    }
  };
  
  const getOptionIcon = (status: string) => {
    switch (status) {
      case 'correct':
        return <FiCheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />;
      case 'incorrect':
        return <FiXCircle className="text-red-500 w-5 h-5 flex-shrink-0" />;
      case 'missed':
        return <FiHelpCircle className="text-yellow-500 w-5 h-5 flex-shrink-0" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-secondary-900 mb-4">{question.text}</h3>
      
      <div className="mb-2 text-sm text-secondary-600">
        {isMultipleChoice ? 'Selecione todas as opções corretas:' : 'Selecione a opção correta:'}
      </div>
      
      <div>
        {question.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const status = getOptionStatus(option.id);
          const optionClasses = getOptionClasses(status);
          const icon = getOptionIcon(status);
          
          return (
            <div
              key={option.id}
              className={optionClasses}
              onClick={() => handleOptionClick(option.id)}
            >
              <div className="mr-3 mt-0.5">
                {isMultipleChoice ? (
                  <div className={`w-5 h-5 border-2 rounded ${
                    isSelected ? 'bg-primary-500 border-primary-500' : 'border-secondary-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className={`w-5 h-5 border-2 rounded-full ${
                    isSelected ? 'border-4 border-primary-500' : 'border-secondary-300'
                  }`} />
                )}
              </div>
              
              <div className="flex-1">
                <div dangerouslySetInnerHTML={{ __html: option.text }} />
              </div>
              
              {icon && <div className="ml-2">{icon}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestQuestion;
