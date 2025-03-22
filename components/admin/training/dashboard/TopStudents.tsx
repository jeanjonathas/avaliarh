import React from 'react';
import Link from 'next/link';
import { UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface Student {
  id: string;
  userId: string;
  name: string;
  avgProgress: number;
  enrolledCourses: number;
}

interface TopStudentsProps {
  students: Student[];
  loading?: boolean;
}

const TopStudents: React.FC<TopStudentsProps> = ({ students, loading = false }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Alunos com Melhor Desempenho</h3>
      </div>
      
      {loading ? (
        <div className="divide-y divide-secondary-200">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="px-6 py-4 flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse mr-4"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-secondary-500">Nenhum aluno matriculado no momento</p>
        </div>
      ) : (
        <div className="divide-y divide-secondary-200">
          {students.map((student) => (
            <div key={student.id} className="px-6 py-4 flex items-center">
              <div className="h-10 w-10 rounded-full bg-secondary-100 flex items-center justify-center mr-4">
                <UserIcon className="h-6 w-6 text-secondary-500" />
              </div>
              
              <div className="flex-1">
                <h4 className="text-md font-medium text-secondary-900">{student.name}</h4>
                <p className="text-sm text-secondary-500">{student.enrolledCourses} cursos matriculados</p>
              </div>
              
              <div className="flex items-center">
                <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                  <div 
                    className={`h-2.5 rounded-full ${
                      student.avgProgress >= 75 
                        ? 'bg-green-500' 
                        : student.avgProgress >= 50 
                        ? 'bg-blue-500' 
                        : student.avgProgress >= 25 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`} 
                    style={{ width: `${student.avgProgress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-secondary-700">{student.avgProgress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-200">
        <Link 
          href="/admin/training/student-management"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center justify-center"
        >
          Ver todos os alunos
          <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default TopStudents;
