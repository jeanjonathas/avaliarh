import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  total, 
  label = 'Progresso', 
  showPercentage = true 
}) => {
  // Calcular a porcentagem de conclusão
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-secondary-700">{label}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-primary-600">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-secondary-500">
        <span>{current} de {total} concluídos</span>
        <span>{total - current} restantes</span>
      </div>
    </div>
  );
};

export default ProgressBar;
