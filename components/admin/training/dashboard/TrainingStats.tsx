import React from 'react';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ClockIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface TrainingStatsProps {
  stats: {
    totalStudents: number;
    totalCourses: number;
    completionRate: number;
    averageTimeSpent: number;
  };
  loading?: boolean;
}

const TrainingStats: React.FC<TrainingStatsProps> = ({ stats, loading = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total de Alunos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-primary-100 p-3 rounded-full">
            <UserGroupIcon className="h-8 w-8 text-primary-600" />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <span className="text-2xl font-bold text-secondary-900">{stats.totalStudents}</span>
          )}
        </div>
        <h3 className="text-lg font-medium text-secondary-700">Total de Alunos</h3>
        <p className="text-sm text-secondary-500 mt-1">Alunos matriculados em cursos</p>
      </div>

      {/* Total de Cursos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <span className="text-2xl font-bold text-secondary-900">{stats.totalCourses}</span>
          )}
        </div>
        <h3 className="text-lg font-medium text-secondary-700">Total de Cursos</h3>
        <p className="text-sm text-secondary-500 mt-1">Cursos disponíveis na plataforma</p>
      </div>

      {/* Taxa de Conclusão */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <span className="text-2xl font-bold text-secondary-900">{stats.completionRate}%</span>
          )}
        </div>
        <h3 className="text-lg font-medium text-secondary-700">Taxa de Conclusão</h3>
        <p className="text-sm text-secondary-500 mt-1">Média de conclusão dos cursos</p>
      </div>

      {/* Tempo Médio */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-yellow-100 p-3 rounded-full">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <span className="text-2xl font-bold text-secondary-900">{stats.averageTimeSpent}h</span>
          )}
        </div>
        <h3 className="text-lg font-medium text-secondary-700">Tempo Médio</h3>
        <p className="text-sm text-secondary-500 mt-1">Tempo médio para conclusão</p>
      </div>
    </div>
  );
};

export default TrainingStats;
