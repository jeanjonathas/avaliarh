import React from 'react';

interface TestProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number[];
  onNavigate: (index: number) => void;
}

const TestProgress: React.FC<TestProgressProps> = ({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  onNavigate
}) => {
  // Gerar array de números de 0 a totalQuestions-1
  const questionIndices = Array.from({ length: totalQuestions }, (_, i) => i);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-secondary-700">Progresso do teste</h3>
        <span className="text-sm text-secondary-500">
          {answeredQuestions.length} de {totalQuestions} respondidas
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {questionIndices.map((index) => {
          const isActive = index === currentQuestion;
          const isAnswered = answeredQuestions.includes(index);
          
          return (
            <button
              key={index}
              onClick={() => onNavigate(index)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-primary-600 text-white ring-2 ring-primary-200' 
                  : isAnswered 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              aria-label={`Ir para questão ${index + 1}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TestProgress;
