import React from 'react';
import { TestSelectorTarget } from './TestSelectorModal';

interface TestAssociationButtonProps {
  hasTest: boolean;
  onAssociate: () => void;
  onRemove: () => void;
  type: 'course' | 'module' | 'lesson';
  compact?: boolean;
}

const TestAssociationButton: React.FC<TestAssociationButtonProps> = ({
  hasTest,
  onAssociate,
  onRemove,
  type,
  compact = false
}) => {
  const getButtonText = () => {
    if (compact) return 'Teste';
    
    switch (type) {
      case 'course':
        return hasTest ? 'Remover Teste Final' : 'Associar Teste Final';
      case 'module':
        return hasTest ? 'Remover Teste do Módulo' : 'Associar Teste ao Módulo';
      case 'lesson':
        return hasTest ? 'Remover Teste da Aula' : 'Associar Teste à Aula';
      default:
        return hasTest ? 'Remover Teste' : 'Associar Teste';
    }
  };

  if (hasTest) {
    return (
      <button
        type="button"
        onClick={onRemove}
        className={`inline-flex items-center ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} border border-gray-300 shadow-sm text-xs font-medium rounded ${compact ? 'text-red-600' : 'text-red-700'} bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
        title={`Remover teste ${type === 'course' ? 'do curso' : type === 'module' ? 'do módulo' : 'da aula'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${compact ? 'mr-1' : 'mr-2'} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {getButtonText()}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAssociate}
      className={`inline-flex items-center ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
      title={`Associar teste ${type === 'course' ? 'ao curso' : type === 'module' ? 'ao módulo' : 'à aula'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${compact ? 'mr-1' : 'mr-2'} text-primary-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {getButtonText()}
    </button>
  );
};

export default TestAssociationButton;
