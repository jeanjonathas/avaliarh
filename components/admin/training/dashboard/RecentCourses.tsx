import React from 'react';
import Link from 'next/link';
import { CalendarIcon, UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Course {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  createdAt: string;
  completionRate: number;
}

interface RecentCoursesProps {
  courses: Course[];
  loading?: boolean;
}

const RecentCourses: React.FC<RecentCoursesProps> = ({ courses, loading = false }) => {
  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Cursos Recentes</h3>
      </div>
      
      {loading ? (
        <div className="divide-y divide-secondary-200">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-secondary-500">Nenhum curso disponível no momento</p>
        </div>
      ) : (
        <div className="divide-y divide-secondary-200">
          {courses.map((course) => (
            <div key={course.id} className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-md font-medium text-secondary-900">{course.name}</h4>
                <span 
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    course.completionRate >= 75 
                      ? 'bg-green-100 text-green-800' 
                      : course.completionRate >= 50 
                      ? 'bg-blue-100 text-blue-800' 
                      : course.completionRate >= 25 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {course.completionRate}% concluído
                </span>
              </div>
              
              <p className="text-sm text-secondary-500 mb-3 line-clamp-2">{course.description}</p>
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-4 text-sm text-secondary-500">
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {formatDate(course.createdAt)}
                  </span>
                  <span className="flex items-center">
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    {course.studentCount} alunos
                  </span>
                </div>
                
                <Link 
                  href={`/admin/training/courses/${course.id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                >
                  Ver detalhes
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-200">
        <Link 
          href="/admin/training/courses"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center justify-center"
        >
          Ver todos os cursos
          <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default RecentCourses;
