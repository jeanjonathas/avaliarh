import React from 'react';
import { 
  UserIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  type: 'total' | 'approved' | 'rejected' | 'pending' | 'score';
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  type,
  loading = false
}) => {
  // Determinar ícone com base no tipo
  const getIcon = () => {
    switch (type) {
      case 'total':
        return <UserIcon className="h-8 w-8 text-gray-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-8 w-8 text-yellow-500" />;
      case 'score':
        return <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />;
      default:
        return <UserIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  // Determinar cor de fundo com base no tipo
  const getBgColor = () => {
    switch (type) {
      case 'total':
        return 'bg-gray-50';
      case 'approved':
        return 'bg-green-50';
      case 'rejected':
        return 'bg-red-50';
      case 'pending':
        return 'bg-yellow-50';
      case 'score':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Formatar valor para exibição
  const formattedValue = type === 'score' && typeof value === 'number' 
    ? `${value}%` 
    : value;

  return (
    <div className={`rounded-lg shadow p-4 ${getBgColor()}`}>
      {loading ? (
        <div className="animate-pulse flex flex-col">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-gray-500">{title}</h3>
              <p className="text-2xl font-bold mt-1">{formattedValue}</p>
            </div>
            <div className="p-2 rounded-full bg-white shadow-sm">
              {getIcon()}
            </div>
          </div>
          
          {change !== undefined && (
            <div className="mt-2">
              <span className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-500 ml-1">desde o último mês</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatsCard;
