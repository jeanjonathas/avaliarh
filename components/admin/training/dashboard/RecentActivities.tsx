import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: 'enrollment' | 'completion' | 'test_submission' | 'certificate';
  userName: string;
  courseName: string;
  timestamp: string;
  details?: string;
}

interface RecentActivitiesProps {
  activities: Activity[];
  loading?: boolean;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities, loading = false }) => {
  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Função para obter o ícone e a cor com base no tipo de atividade
  const getActivityStyles = (type: Activity['type']) => {
    switch (type) {
      case 'enrollment':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          ),
          message: 'se matriculou no curso'
        };
      case 'completion':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          message: 'concluiu o curso'
        };
      case 'test_submission':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          message: 'realizou um teste em'
        };
      case 'certificate':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          ),
          message: 'recebeu certificado do curso'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          message: 'realizou uma ação em'
        };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Atividades Recentes</h3>
      </div>
      
      {loading ? (
        <div className="divide-y divide-secondary-200">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="px-6 py-4 flex items-start">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse mr-3"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-secondary-500">Nenhuma atividade recente</p>
        </div>
      ) : (
        <div className="divide-y divide-secondary-200">
          {activities.map((activity) => {
            const { bgColor, textColor, icon, message } = getActivityStyles(activity.type);
            
            return (
              <div key={activity.id} className="px-6 py-4 flex items-start">
                <div className={`${bgColor} ${textColor} p-2 rounded-full mr-3 flex-shrink-0`}>
                  {icon}
                </div>
                
                <div className="flex-1">
                  <p className="text-secondary-900">
                    <span className="font-medium">{activity.userName}</span>{' '}
                    {message}{' '}
                    <span className="font-medium">{activity.courseName}</span>
                  </p>
                  {activity.details && (
                    <p className="text-sm text-secondary-500 mt-1">{activity.details}</p>
                  )}
                </div>
                
                <div className="text-xs text-secondary-500 flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {formatDate(activity.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentActivities;
