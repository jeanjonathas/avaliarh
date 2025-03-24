import React from 'react';
import { ClockIcon, CalendarIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface AccessLog {
  id: string;
  studentId: string;
  courseId: string;
  accessDate: string;
  timeSpent: number;
  course?: {
    name: string;
  };
}

interface StudentAccessLogsProps {
  accessLogs: AccessLog[];
}

const StudentAccessLogs: React.FC<StudentAccessLogsProps> = ({ accessLogs }) => {
  if (!accessLogs || accessLogs.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
          <ClockIcon className="w-5 h-5 mr-2 text-primary-600" />
          Acessos Recentes
        </h3>
        <div className="text-center py-8">
          <p className="text-secondary-500">
            Nenhum acesso registrado para este aluno.
          </p>
        </div>
      </div>
    );
  }

  // Função para formatar o tempo gasto em formato legível
  const formatTimeSpent = (minutes: number): string => {
    if (minutes < 1) return 'Menos de 1 minuto';
    if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let result = `${hours} hora${hours !== 1 ? 's' : ''}`;
    if (remainingMinutes > 0) {
      result += ` e ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
    }
    
    return result;
  };

  // Função para formatar a data de acesso
  const formatAccessDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <ClockIcon className="w-5 h-5 mr-2 text-primary-600" />
        Acessos Recentes
      </h3>

      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Data e Hora
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Curso
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Tempo Gasto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {accessLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-secondary-400" />
                    {formatAccessDate(log.accessDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">
                  <div className="flex items-center">
                    <BookOpenIcon className="w-4 h-4 mr-2 text-primary-500" />
                    {log.course?.name || 'Curso não especificado'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">
                  {formatTimeSpent(log.timeSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentAccessLogs;
