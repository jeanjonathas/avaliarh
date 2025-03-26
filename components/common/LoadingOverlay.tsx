import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  zIndex?: number;
  comment?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = "Carregando...", 
  fullScreen = false,
  zIndex = 40,
  comment
}) => {
  if (!isLoading) return null;

  return (
    <>
      {comment && (
        <div className="sr-only">{comment}</div>
      )}
      <div 
        className={`${fullScreen ? 'fixed inset-0' : 'absolute inset-0'} bg-black bg-opacity-20 z-${zIndex} flex items-center justify-center`}
      >
        <div className="bg-white rounded-lg p-4 shadow-lg flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
          <span className="text-gray-700">{message}</span>
        </div>
      </div>
    </>
  );
};

export default LoadingOverlay;
