import React from 'react';
import { DocumentCheckIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  maxScore: number;
  startTime: string;
  endTime: string;
  passed: boolean;
  test?: {
    id: string;
    title: string;
    moduleId: string;
    module?: {
      name: string;
      courseId: string;
      course?: {
        name: string;
      };
    };
  };
}

interface StudentTestResultsProps {
  testAttempts: TestAttempt[];
}

const StudentTestResults: React.FC<StudentTestResultsProps> = ({ testAttempts }) => {
  if (!testAttempts || testAttempts.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
          <DocumentCheckIcon className="w-5 h-5 mr-2 text-primary-600" />
          Resultados de Testes
        </h3>
        <div className="text-center py-8">
          <p className="text-secondary-500">
            Este aluno ainda não realizou nenhum teste.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <DocumentCheckIcon className="w-5 h-5 mr-2 text-primary-600" />
        Resultados de Testes
      </h3>

      <div className="space-y-4">
        {testAttempts.map((attempt) => (
          <div key={attempt.id} className="border border-secondary-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-secondary-800">
                {attempt.test?.title || 'Teste sem título'}
              </h4>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {attempt.passed ? 'Aprovado' : 'Reprovado'}
              </div>
            </div>
            
            {attempt.test?.module?.course && (
              <p className="text-sm text-secondary-600 mb-3 flex items-center">
                <DocumentTextIcon className="w-4 h-4 mr-1 text-secondary-400" />
                {attempt.test.module.course.name} &gt; {attempt.test.module.name}
              </p>
            )}
            
            <div className="flex flex-wrap gap-4 mb-3 text-sm">
              <div className="flex items-center text-secondary-700">
                <span className="font-medium mr-1">Data:</span>
                {new Date(attempt.endTime).toLocaleDateString('pt-BR')}
              </div>
              
              <div className="flex items-center text-secondary-700">
                <span className="font-medium mr-1">Duração:</span>
                {formatDuration(new Date(attempt.startTime), new Date(attempt.endTime))}
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-secondary-700 mb-1">
                <span className="font-medium">Pontuação:</span>
                <span className={`${getScoreColorClass(attempt.score, attempt.maxScore)}`}>
                  {attempt.score} / {attempt.maxScore} ({Math.round((attempt.score / attempt.maxScore) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-secondary-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getProgressColorClass(attempt.score / attempt.maxScore * 100)}`}
                  style={{ width: `${(attempt.score / attempt.maxScore) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Função para calcular a duração entre duas datas
const formatDuration = (startTime: Date, endTime: Date): string => {
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / (1000 * 60));
  
  if (minutes < 1) return 'Menos de 1 minuto';
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  let result = `${hours} hora${hours !== 1 ? 's' : ''}`;
  if (remainingMinutes > 0) {
    result += ` e ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  return result;
};

// Função para determinar a cor da pontuação
const getScoreColorClass = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-blue-600';
  if (percentage >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

// Função para determinar a cor da barra de progresso
const getProgressColorClass = (progress: number): string => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 60) return 'bg-blue-500';
  if (progress >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default StudentTestResults;
