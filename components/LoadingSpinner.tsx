import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 8, 
  color = 'primary-600',
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`w-${size} h-${size} border-4 border-secondary-200 border-t-${color} rounded-full animate-spin`}></div>
    </div>
  );
};

export default LoadingSpinner;
