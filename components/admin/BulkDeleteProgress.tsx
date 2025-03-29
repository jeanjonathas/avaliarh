import React from 'react';
import ProgressBar from './ProgressBar';

interface BulkDeleteProgressProps {
  isOpen: boolean;
  current: number;
  total: number;
  onCancel?: () => void;
  canCancel?: boolean;
}

const BulkDeleteProgress: React.FC<BulkDeleteProgressProps> = ({
  isOpen,
  current,
  total,
  onCancel,
  canCancel = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">
          Excluindo perguntas
        </h3>
        
        <ProgressBar 
          current={current} 
          total={total} 
          label="Progresso da exclusão" 
        />
        
        <div className="mt-6 text-sm text-secondary-600">
          <p>Por favor, aguarde enquanto as perguntas selecionadas são excluídas.</p>
          <p className="mt-2">Não feche esta janela até que o processo seja concluído.</p>
        </div>
        
        {canCancel && onCancel && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkDeleteProgress;
