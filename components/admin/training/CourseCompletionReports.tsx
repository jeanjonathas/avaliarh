import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  DocumentChartBarIcon, 
  ArrowDownTrayIcon, 
  CalendarIcon,
  AcademicCapIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

interface Course {
  id: string;
  name: string;
}

interface CompletionData {
  courseId: string;
  courseName: string;
  totalEnrolled: number;
  totalCompleted: number;
  completionRate: number;
  averageScore: number;
  averageTimeToComplete: number; // in days
  startDate: string;
  endDate: string;
  departmentStats: {
    departmentName: string;
    enrolled: number;
    completed: number;
    completionRate: number;
    averageScore: number;
  }[];
  monthlyCompletions: {
    month: string;
    completions: number;
  }[];
}

interface CourseCompletionReportsProps {
  courseId?: string;
}

const CourseCompletionReports: React.FC<CourseCompletionReportsProps> = ({ courseId }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/training/courses');
      setCourses(response.data);
      
      // Set default course if not provided
      if (!courseId && response.data.length > 0) {
        setSelectedCourseId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  }, [courseId]);

  // Fetch completion data
  const fetchCompletionData = useCallback(async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/admin/training/reports/completion`, {
        params: {
          courseId: selectedCourseId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      setCompletionData(response.data);
    } catch (error) {
      console.error('Error fetching completion data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, dateRange]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCompletionData();
    }
  }, [selectedCourseId, fetchCompletionData]);

  // Export to PDF
  const exportToPDF = () => {
    if (!completionData) return;
    
    // In a real implementation, this would generate a PDF using a library like jsPDF
    // For now, we'll just simulate the download by creating a CSV
    exportToCSV();
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!completionData) return;
    
    // Create CSV content
    const headers = [
      'Curso',
      'Total de Matriculados',
      'Total de Concluintes',
      'Taxa de Conclusão (%)',
      'Nota Média',
      'Tempo Médio para Conclusão (dias)',
      'Período de Análise'
    ].join(',');
    
    const mainRow = [
      `"${completionData.courseName}"`,
      completionData.totalEnrolled,
      completionData.totalCompleted,
      completionData.completionRate.toFixed(2),
      completionData.averageScore.toFixed(2),
      completionData.averageTimeToComplete.toFixed(1),
      `"${new Date(completionData.startDate).toLocaleDateString('pt-BR')} - ${new Date(completionData.endDate).toLocaleDateString('pt-BR')}"`
    ].join(',');
    
    // Department stats
    const departmentHeaders = [
      '',
      'Departamento',
      'Matriculados',
      'Concluintes',
      'Taxa de Conclusão (%)',
      'Nota Média'
    ].join(',');
    
    const departmentRows = completionData.departmentStats.map(dept => 
      [
        '',
        `"${dept.departmentName}"`,
        dept.enrolled,
        dept.completed,
        dept.completionRate.toFixed(2),
        dept.averageScore.toFixed(2)
      ].join(',')
    );
    
    // Monthly completions
    const monthlyHeaders = [
      '',
      'Mês',
      'Concluintes'
    ].join(',');
    
    const monthlyRows = completionData.monthlyCompletions.map(month => 
      [
        '',
        `"${month.month}"`,
        month.completions
      ].join(',')
    );
    
    // Combine all content
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${mainRow}\n\n${departmentHeaders}\n${departmentRows.join('\n')}\n\n${monthlyHeaders}\n${monthlyRows.join('\n')}`;
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_conclusao_${completionData.courseName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Relatórios de Conclusão de Cursos</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Analise as taxas de conclusão e desempenho dos alunos nos cursos
        </p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        {/* Course and date selection */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
          <div>
            <label htmlFor="course" className="block text-sm font-medium text-gray-700">
              Selecione o Curso
            </label>
            <select
              id="course"
              name="course"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione um curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Data Inicial
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                Data Final
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="date"
                  name="endDate"
                  id="endDate"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Export buttons */}
        {!loading && completionData && (
          <div className="mb-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={exportToPDF}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={loading}
            >
              <DocumentChartBarIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={loading}
            >
              <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </button>
          </div>
        )}
        
        {/* Report content */}
        {loading ? (
          <div className="py-10 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {!completionData ? (
              <div className="text-center py-10">
                <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado disponível</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCourseId 
                    ? 'Não há dados de conclusão para o período selecionado.' 
                    : 'Selecione um curso para visualizar os relatórios de conclusão.'}
                </p>
              </div>
            ) : (
              <div>
                {/* Main stats */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                  {/* Completion Rate */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                          <ChartPieIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Taxa de Conclusão</dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">{formatPercentage(completionData.completionRate)}</div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">
                          {completionData.totalCompleted} de {completionData.totalEnrolled} alunos
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Average Score */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                          <AcademicCapIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Nota Média</dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">{completionData.averageScore.toFixed(1)}</div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <div className={`font-medium ${
                          completionData.averageScore >= 70 ? 'text-green-700' : 
                          completionData.averageScore >= 50 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {completionData.averageScore >= 70 ? 'Acima da média' : 
                           completionData.averageScore >= 50 ? 'Na média' : 'Abaixo da média'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Time to Complete */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                          <CalendarIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Tempo Médio p/ Conclusão</dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">{completionData.averageTimeToComplete.toFixed(1)} dias</div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">
                          Período: {new Date(completionData.startDate).toLocaleDateString('pt-BR')} - {new Date(completionData.endDate).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Monthly trend */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                          <DocumentChartBarIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Tendência Mensal</dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                {completionData.monthlyCompletions.length > 0 
                                  ? `${completionData.monthlyCompletions[completionData.monthlyCompletions.length - 1].completions} concluintes` 
                                  : '0 concluintes'}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">
                          {completionData.monthlyCompletions.length > 1 
                            ? `Último mês: ${completionData.monthlyCompletions[completionData.monthlyCompletions.length - 1].month}` 
                            : 'Sem dados mensais suficientes'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Department breakdown */}
                <div className="mb-8">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Conclusão por Departamento</h3>
                  
                  {completionData.departmentStats.length === 0 ? (
                    <p className="text-sm text-gray-500">Não há dados de departamentos disponíveis.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Departamento
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Matriculados
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Concluintes
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Taxa de Conclusão
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nota Média
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {completionData.departmentStats.map((dept, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {dept.departmentName || 'Sem departamento'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dept.enrolled}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {dept.completed}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        dept.completionRate >= 70 ? 'bg-green-600' : 
                                        dept.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(100, dept.completionRate)}%` }}
                                    ></div>
                                  </div>
                                  <span>{formatPercentage(dept.completionRate)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`${
                                  dept.averageScore >= 70 ? 'text-green-600' : 
                                  dept.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {dept.averageScore.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Monthly completions */}
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Conclusões Mensais</h3>
                  
                  {completionData.monthlyCompletions.length === 0 ? (
                    <p className="text-sm text-gray-500">Não há dados mensais disponíveis para o período selecionado.</p>
                  ) : (
                    <div className="h-64 bg-white p-4 rounded-lg border border-gray-200">
                      {/* In a real implementation, this would be a chart using a library like Chart.js or Recharts */}
                      <div className="h-full flex items-end justify-around">
                        {completionData.monthlyCompletions.map((month, index) => {
                          const maxCompletions = Math.max(...completionData.monthlyCompletions.map(m => m.completions));
                          const height = maxCompletions > 0 ? (month.completions / maxCompletions) * 100 : 0;
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div 
                                className="w-12 bg-primary-500 rounded-t"
                                style={{ height: `${height}%` }}
                              ></div>
                              <div className="mt-2 text-xs text-gray-500">{month.month}</div>
                              <div className="text-xs font-medium">{month.completions}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCompletionReports;
