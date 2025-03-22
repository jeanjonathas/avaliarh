import React from 'react';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface InsightCardProps {
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  description: string;
  loading?: boolean;
}

const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  loading = false
}) => {
  // Determinar ícone com base no tipo
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'tip':
        return <LightBulbIcon className="h-6 w-6 text-purple-500" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  // Determinar cor de fundo com base no tipo
  const getBgColor = () => {
    switch (type) {
      case 'info':
        return 'bg-blue-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'success':
        return 'bg-green-50';
      case 'tip':
        return 'bg-purple-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className={`rounded-lg shadow p-4 mb-3 ${getBgColor()}`}>
      {loading ? (
        <div className="animate-pulse flex">
          <div className="rounded-full bg-gray-200 h-6 w-6 mr-3"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      ) : (
        <div className="flex">
          <div className="mr-3 mt-1">
            {getIcon()}
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightCard;
