import React from 'react';
import Link from 'next/link';
import { AcademicCapIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface CourseCardProps {
  id: string;
  title: string;
  category: string;
  instructor: string;
  duration: string;
  studentCount: number;
  completionRate: number;
  loading?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  category,
  instructor,
  duration,
  studentCount,
  completionRate,
  loading = false
}) => {
  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (completionRate < 30) return 'bg-yellow-500';
    if (completionRate < 70) return 'bg-blue-500';
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
          <Link href={`/admin/training/${id}`} className="hover:text-sky-600 transition-colors">
            <h3 className="text-lg font-semibold mb-1 truncate">{title}</h3>
          </Link>
          <div className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-3">
            {category}
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <AcademicCapIcon className="h-4 w-4 mr-2" />
            <span>{instructor}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>{duration}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            <span>{studentCount} aluno{studentCount !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Taxa de Conclusão</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressColor()}`} 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CourseCard;
