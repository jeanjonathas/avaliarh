import React from 'react';
import { FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passingScore: number;
  courseId?: string;
  courseName?: string;
  testType: 'COURSE' | 'MODULE' | 'LESSON';
  onRetry?: () => void;
}

const TestResults: React.FC<TestResultsProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  passingScore,
  courseId,
  courseName,
  testType,
  onRetry
}) => {
  const isPassed = score >= passingScore;
  
  // Determinar mensagem baseada no resultado
  const getMessage = () => {
    if (isPassed) {
      if (score >= 90) {
        return "Excelente trabalho! Você demonstrou um conhecimento excepcional do conteúdo.";
      } else if (score >= 80) {
        return "Muito bom! Você demonstrou um bom entendimento do conteúdo.";
      } else {
        return "Parabéns! Você passou no teste.";
      }
    } else {
      return "Infelizmente você não atingiu a pontuação mínima necessária. Revise o conteúdo e tente novamente.";
    }
  };
  
  // Determinar o título do resultado
  const getTitle = () => {
    if (isPassed) {
      return "Teste concluído com sucesso!";
    } else {
      return "Teste não aprovado";
    }
  };
  
  // Determinar o ícone do resultado
  const getIcon = () => {
    if (isPassed) {
      return <FiCheckCircle className="w-12 h-12 text-green-500 mb-4" />;
    } else {
      return <FiXCircle className="w-12 h-12 text-red-500 mb-4" />;
    }
  };
  
  // Determinar a cor do cartão de resultado
  const getCardColor = () => {
    if (isPassed) {
      return "border-green-200 bg-green-50";
    } else {
      return "border-red-200 bg-red-50";
    }
  };
  
  return (
    <div className={`border rounded-lg p-6 ${getCardColor()}`}>
      <div className="flex flex-col items-center text-center mb-6">
        {getIcon()}
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">{getTitle()}</h2>
        <p className="text-secondary-600">{getMessage()}</p>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-1">{score}%</div>
            <div className="text-sm text-secondary-500">Pontuação</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary-900 mb-1">{correctAnswers}/{totalQuestions}</div>
            <div className="text-sm text-secondary-500">Respostas corretas</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary-900 mb-1">{passingScore}%</div>
            <div className="text-sm text-secondary-500">Pontuação mínima</div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        {courseId && (
          <Link href={`/treinamento/cursos/${courseId}`}>
            <button className="px-6 py-3 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-medium rounded-md transition-colors">
              Voltar para o curso
            </button>
          </Link>
        )}
        
        {!isPassed && onRetry && (
          <button 
            onClick={onRetry}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
          >
            Tentar novamente
          </button>
        )}
        
        {isPassed && testType === 'COURSE' && (
          <Link href={`/treinamento/certificados/${courseId}`}>
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors">
              Ver certificado
            </button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default TestResults;
