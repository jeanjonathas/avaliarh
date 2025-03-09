import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  duration = 10000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Configurar o intervalo para atualizar a barra de progresso
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress - (100 / (duration / 100));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    setIntervalId(interval);

    // Configurar o timeout para fechar o toast
    const timeout = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    // Limpar intervalos e timeouts quando o componente for desmontado
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, onClose]);

  // Fechar o toast manualmente
  const handleClose = () => {
    setVisible(false);
    if (intervalId) clearInterval(intervalId);
    if (onClose) onClose();
  };

  // Pausar a barra de progresso quando o mouse estiver sobre o toast
  const handleMouseEnter = () => {
    if (intervalId) clearInterval(intervalId);
  };

  // Retomar a barra de progresso quando o mouse sair do toast
  const handleMouseLeave = () => {
    const remainingTime = (progress / 100) * duration;
    
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress - (100 / (remainingTime / 100));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    setIntervalId(interval);

    // Configurar o timeout para fechar o toast
    setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, remainingTime);
  };

  // Definir as cores com base no tipo de toast
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-100',
          border: 'border-green-500',
          text: 'text-green-800',
          progressBg: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          border: 'border-red-500',
          text: 'text-red-800',
          progressBg: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          border: 'border-yellow-500',
          text: 'text-yellow-800',
          progressBg: 'bg-yellow-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-500',
          text: 'text-blue-800',
          progressBg: 'bg-blue-500'
        };
    }
  };

  const styles = getTypeStyles();

  if (!visible) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 max-w-sm p-4 ${styles.bg} border-l-4 ${styles.border} rounded-md shadow-md z-50 transition-all duration-300 ease-in-out`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex justify-between items-start">
        <div className={`font-medium ${styles.text}`}>
          {message}
        </div>
        <button 
          onClick={handleClose}
          className={`ml-4 ${styles.text} hover:text-opacity-75 focus:outline-none`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`${styles.progressBg} h-1.5 rounded-full transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;
