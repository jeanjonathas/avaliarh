import React from 'react';
import Link from 'next/link';
import { CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface ProcessCardProps {
  id: string;
  title: string;
  position: string;
  candidateCount: number;
  startDate: string;
  progress: number;
  loading?: boolean;
}

const ProcessCard: React.FC<ProcessCardProps> = ({
  id,
  title,
  position,
  candidateCount,
  startDate,
  progress,
  loading = false
}) => {
  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (progress < 30) return 'bg-yellow-500';
    if (progress < 70) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      {loading ? (
        <div className="animate-pulse flex flex-col">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="flex mb-3">
            <div className="h-4 w-4 bg-gray-200 rounded-full mr-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="flex mb-4">
            <div className="h-4 w-4 bg-gray-200 rounded-full mr-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
        </div>
      ) : (
        <>
          <Link href={`/admin/processes/${id}`} className="hover:text-sky-600 transition-colors">
            <h3 className="text-lg font-semibold mb-1 truncate">{title}</h3>
          </Link>
          <p className="text-sm text-gray-600 mb-3">{position}</p>
          
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            <span>{candidateCount} candidato{candidateCount !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>Iniciado em {formatDate(startDate)}</span>
          </div>
          
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressColor()}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProcessCard;
