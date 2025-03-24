import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircleIcon, AcademicCapIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  name: string;
  description?: string;
  enrolled?: boolean;
}

interface StudentEnrollmentManagerProps {
  studentId: string;
  onEnrollmentChange?: () => void;
}

const StudentEnrollmentManager: React.FC<StudentEnrollmentManagerProps> = ({ 
  studentId,
  onEnrollmentChange
}) => {
  const [loading, setLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [enrollingCourse, setEnrollingCourse] = useState(false);

  // Buscar cursos disponíveis
  useEffect(() => {
    const fetchAvailableCourses = async () => {
      if (!studentId) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`/api/admin/training/students/${studentId}`);
        if (response.data.availableCourses) {
          setAvailableCourses(response.data.availableCourses);
          
          // Selecionar o primeiro curso disponível por padrão
          if (response.data.availableCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(response.data.availableCourses[0].id);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar cursos disponíveis:', error);
        toast.error('Não foi possível carregar os cursos disponíveis');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableCourses();
  }, [studentId, selectedCourseId]);

  // Matricular aluno no curso selecionado
  const handleEnrollStudent = async () => {
    if (!selectedCourseId) {
      toast.error('Selecione um curso para matricular o aluno');
      return;
    }

    setEnrollingCourse(true);
    try {
      const response = await axios.post(`/api/admin/training/students/${studentId}/enroll`, {
        courseId: selectedCourseId
      });

      if (response.status === 201) {
        toast.success('Aluno matriculado com sucesso!');
        
        // Atualizar a lista de cursos disponíveis
        setAvailableCourses(prev => 
          prev.filter(course => course.id !== selectedCourseId)
        );
        
        // Selecionar o próximo curso disponível, se houver
        if (availableCourses.length > 1) {
          const nextCourse = availableCourses.find(course => course.id !== selectedCourseId);
          if (nextCourse) {
            setSelectedCourseId(nextCourse.id);
          } else {
            setSelectedCourseId('');
          }
        } else {
          setSelectedCourseId('');
        }
        
        // Notificar o componente pai sobre a mudança
        if (onEnrollmentChange) {
          onEnrollmentChange();
        }
      }
    } catch (error) {
      console.error('Erro ao matricular aluno:', error);
      let errorMessage = 'Erro ao matricular aluno no curso';
      
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setEnrollingCourse(false);
    }
  };

  // Verificar se há cursos disponíveis para matrícula
  const hasAvailableCourses = availableCourses.length > 0;

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <AcademicCapIcon className="w-5 h-5 mr-2 text-primary-600" />
        Matricular em Novo Curso
      </h3>

      {loading ? (
        <div className="py-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-secondary-600">Carregando cursos disponíveis...</p>
        </div>
      ) : !hasAvailableCourses ? (
        <div className="text-center py-4">
          <p className="text-secondary-500">
            Não há cursos disponíveis para matrícula.
          </p>
          <p className="text-sm text-secondary-400 mt-1">
            O aluno já está matriculado em todos os cursos disponíveis.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-1">
              Selecione um curso:
            </label>
            <select
              id="courseSelect"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={enrollingCourse}
            >
              <option value="" disabled>Selecione um curso</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCourseId && (
            <div className="mb-4">
              <p className="text-sm text-secondary-600">
                {availableCourses.find(c => c.id === selectedCourseId)?.description || 
                  'Nenhuma descrição disponível para este curso.'}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEnrollStudent}
              disabled={!selectedCourseId || enrollingCourse}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrollingCourse ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Matriculando...
                </>
              ) : (
                <>
                  <PlusCircleIcon className="w-4 h-4 mr-2" />
                  Matricular Aluno
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentEnrollmentManager;
