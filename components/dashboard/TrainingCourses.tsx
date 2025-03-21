import React from 'react';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  category: string;
  studentCount: number;
  completionRate: number;
  instructor: string;
  duration: string;
}

interface TrainingCoursesProps {
  courses: Course[];
}

const TrainingCourses: React.FC<TrainingCoursesProps> = ({ courses }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Cursos de Treinamento</h3>
      </div>
      <div className="divide-y divide-secondary-200">
        {courses.length === 0 ? (
          <div className="px-6 py-4 text-center text-secondary-500">
            Nenhum curso de treinamento disponível no momento
          </div>
        ) : (
          courses.slice(0, 5).map((course) => (
            <div key={course.id} className="px-6 py-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-md font-medium text-secondary-900">{course.title}</h4>
                  <p className="text-sm text-secondary-500">{course.category}</p>
                </div>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {course.duration}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-secondary-600">
                  <span className="font-medium">{course.studentCount}</span> alunos
                </div>
                <div className="text-sm text-secondary-600">
                  Instrutor: {course.instructor}
                </div>
              </div>
              
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-primary-600">
                      Taxa de Conclusão: {course.completionRate}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-primary-200">
                  <div 
                    style={{ width: `${course.completionRate}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                  ></div>
                </div>
              </div>
              
              <div className="mt-2 text-right">
                <Link 
                  href={`/admin/training/courses/${course.id}`}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Ver detalhes
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-6 py-4 border-t border-secondary-200">
        <Link 
          href="/admin/training/courses"
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          Ver todos os cursos →
        </Link>
      </div>
    </div>
  );
};

export default TrainingCourses;
