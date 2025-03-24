import React, { useState, useEffect } from 'react';
import { FiClock, FiAlertCircle } from 'react-icons/fi';

interface TestTimerProps {
  duration: number; // em minutos
  onTimeUp: () => void;
  isPaused?: boolean;
}

const TestTimer: React.FC<TestTimerProps> = ({ 
  duration, 
  onTimeUp,
  isPaused = false
}) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // converter para segundos
  const [isWarning, setIsWarning] = useState(false);
  
  useEffect(() => {
    if (isPaused) return;
    
    // Verificar se já acabou o tempo
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    
    // Verificar se está em estado de alerta (menos de 20% do tempo restante)
    if (timeLeft <= duration * 60 * 0.2) {
      setIsWarning(true);
    }
    
    // Atualizar o tempo a cada segundo
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, duration, onTimeUp, isPaused]);
  
  // Formatar o tempo restante
  const formatTime = () => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };
  
  return (
    <div className={`flex items-center ${isWarning ? 'text-red-600' : 'text-secondary-700'}`}>
      {isWarning ? (
        <FiAlertCircle className="w-5 h-5 mr-2" />
      ) : (
        <FiClock className="w-5 h-5 mr-2" />
      )}
      <span className={`font-mono text-lg ${isWarning ? 'font-bold' : 'font-medium'}`}>
        {formatTime()}
      </span>
    </div>
  );
};

export default TestTimer;
