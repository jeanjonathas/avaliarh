import React from 'react';
import { AcademicCapIcon, BookOpenIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface CourseEnrollment {
  id: string;
  courseId: string;
  enrollmentDate: string;
  completionDate?: string;
  progress: number;
  course?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface StudentCourseProgressProps {
  enrollments: CourseEnrollment[];
}

const StudentCourseProgress: React.FC<StudentCourseProgressProps> = ({ enrollments }) => {
  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2 text-primary-600" />
          Progresso nos Cursos
        </h3>
        <div className="text-center py-8">
          <p className="text-secondary-500">
            Este aluno ainda não está matriculado em nenhum curso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <AcademicCapIcon className="w-5 h-5 mr-2 text-primary-600" />
        Progresso nos Cursos
      </h3>

      <div className="space-y-6">
        {enrollments.map((enrollment) => (
          <div key={enrollment.id} className="border border-secondary-200 rounded-lg p-4">
            <h4 className="font-medium text-secondary-800 mb-2">
              {enrollment.course?.name || 'Curso sem nome'}
            </h4>
            
            {enrollment.course?.description && (
              <p className="text-sm text-secondary-600 mb-3">
                {enrollment.course.description}
              </p>
            )}
            
            <div className="flex flex-wrap gap-4 mb-3 text-sm">
              <div className="flex items-center text-secondary-700">
                <ClockIcon className="w-4 h-4 mr-1 text-secondary-500" />
                Matrícula: {new Date(enrollment.enrollmentDate).toLocaleDateString('pt-BR')}
              </div>
              
              {enrollment.completionDate && (
                <div className="flex items-center text-green-600">
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Concluído em: {new Date(enrollment.completionDate).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-xs text-secondary-700 mb-1">
                <span>Progresso</span>
                <span>{Math.round(enrollment.progress)}%</span>
              </div>
              <div className="w-full bg-secondary-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getProgressColorClass(enrollment.progress)}`}
                  style={{ width: `${enrollment.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Função para determinar a cor da barra de progresso
const getProgressColorClass = (progress: number): string => {
  if (progress >= 75) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default StudentCourseProgress;
