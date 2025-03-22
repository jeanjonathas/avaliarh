import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ChartBarIcon, 
  AcademicCapIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface Course {
  id: string;
  name: string;
}

interface StudentProgress {
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  enrollmentDate: string;
  completedModules: number;
  totalModules: number;
  completedLessons: number;
  totalLessons: number;
  completedTests: number;
  totalTests: number;
  averageScore: number;
  timeSpent: number; // in minutes
  lastActivity: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface StudentProgressDashboardProps {
  courseId?: string;
}

const StudentProgressDashboard: React.FC<StudentProgressDashboardProps> = ({ courseId }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StudentProgress; direction: 'ascending' | 'descending' }>({
    key: 'userName',
    direction: 'ascending'
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

  // Fetch student progress data
  const fetchStudentProgress = useCallback(async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/admin/training/progress?courseId=${selectedCourseId}`);
      setStudentProgress(response.data);
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchStudentProgress();
    }
  }, [selectedCourseId, fetchStudentProgress]);

  // Handle sorting
  const requestSort = (key: keyof StudentProgress) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting and filtering
  const getSortedAndFilteredData = () => {
    let filteredData = [...studentProgress];
    
    // Apply search filter
    if (searchTerm) {
      filteredData = filteredData.filter(student => 
        student.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.department && student.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(student => student.status === statusFilter);
    }
    
    // Apply sorting
    filteredData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    return filteredData;
  };

  // Format time spent (minutes) to readable format
  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    }
    
    return `${hours}h ${mins}m`;
  };

  // Calculate overall course statistics
  const calculateStats = () => {
    if (studentProgress.length === 0) {
      return {
        enrolledCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        averageCompletion: 0,
        averageScore: 0
      };
    }
    
    const completedCount = studentProgress.filter(s => s.status === 'completed').length;
    const inProgressCount = studentProgress.filter(s => s.status === 'in_progress').length;
    const notStartedCount = studentProgress.filter(s => s.status === 'not_started').length;
    
    // Calculate average completion percentage
    const totalCompletionPercentage = studentProgress.reduce((sum, student) => {
      const completionPercentage = student.totalLessons > 0 
        ? (student.completedLessons / student.totalLessons) * 100 
        : 0;
      return sum + completionPercentage;
    }, 0);
    
    // Calculate average test score
    const studentsWithTests = studentProgress.filter(s => s.completedTests > 0);
    const averageScore = studentsWithTests.length > 0
      ? studentsWithTests.reduce((sum, s) => sum + s.averageScore, 0) / studentsWithTests.length
      : 0;
    
    return {
      enrolledCount: studentProgress.length,
      completedCount,
      inProgressCount,
      notStartedCount,
      averageCompletion: totalCompletionPercentage / studentProgress.length,
      averageScore
    };
  };

  const stats = calculateStats();
  const sortedAndFilteredData = getSortedAndFilteredData();

  // Export progress data to CSV
  const exportToCSV = () => {
    if (sortedAndFilteredData.length === 0) return;
    
    // Get the selected course name
    const courseName = courses.find(c => c.id === selectedCourseId)?.name || 'curso';
    
    // Create CSV header
    const headers = [
      'Nome', 
      'Email', 
      'Departamento', 
      'Data de Matrícula', 
      'Módulos Concluídos', 
      'Total de Módulos',
      'Lições Concluídas',
      'Total de Lições',
      'Testes Concluídos',
      'Total de Testes',
      'Nota Média',
      'Tempo Gasto (min)',
      'Última Atividade',
      'Status'
    ].join(',');
    
    // Create CSV rows
    const rows = sortedAndFilteredData.map(student => {
      const status = {
        'not_started': 'Não iniciado',
        'in_progress': 'Em andamento',
        'completed': 'Concluído'
      }[student.status];
      
      return [
        `"${student.userName}"`,
        `"${student.userEmail}"`,
        `"${student.department || ''}"`,
        `"${new Date(student.enrollmentDate).toLocaleDateString('pt-BR')}"`,
        student.completedModules,
        student.totalModules,
        student.completedLessons,
        student.totalLessons,
        student.completedTests,
        student.totalTests,
        student.averageScore.toFixed(1),
        student.timeSpent,
        `"${new Date(student.lastActivity).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}"`,
        `"${status}"`
      ].join(',');
    });
    
    // Combine header and rows
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `progresso_${courseName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Dashboard de Progresso dos Alunos</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Acompanhe o progresso dos alunos nos cursos de treinamento
        </p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        {/* Course selection */}
        <div className="mb-6">
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
        
        {/* Stats cards */}
        {!loading && studentProgress.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {/* Enrolled Students */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <AcademicCapIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Alunos Matriculados</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.enrolledCount}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700 font-medium">{stats.completedCount} concluídos</span>
                    <span className="text-yellow-700 font-medium">{stats.inProgressCount} em andamento</span>
                    <span className="text-gray-700 font-medium">{stats.notStartedCount} não iniciados</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Average Completion */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <ChartBarIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Conclusão Média</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.averageCompletion.toFixed(1)}%</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, stats.averageCompletion)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Average Score */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <CheckCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Nota Média</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{stats.averageScore.toFixed(1)}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        stats.averageScore >= 70 ? 'bg-green-600' : 
                        stats.averageScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, stats.averageScore)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              <div className="p-5 flex items-center justify-center h-full">
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={loading || studentProgress.length === 0}
                >
                  <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Exportar Relatório CSV
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Search and filters */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="w-full sm:w-1/2">
            <label htmlFor="search" className="sr-only">
              Buscar alunos
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AcademicCapIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Buscar por nome, email ou departamento"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              id="status-filter"
              name="status-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={loading}
            >
              <option value="all">Todos os status</option>
              <option value="completed">Concluído</option>
              <option value="in_progress">Em andamento</option>
              <option value="not_started">Não iniciado</option>
            </select>
          </div>
        </div>
        
        {/* Progress table */}
        {loading ? (
          <div className="py-10 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {sortedAndFilteredData.length === 0 ? (
              <div className="text-center py-10">
                <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum aluno encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCourseId 
                    ? 'Não há alunos matriculados neste curso ou os filtros aplicados não retornaram resultados.' 
                    : 'Selecione um curso para ver o progresso dos alunos.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('userName')}
                      >
                        Nome
                        {sortConfig.key === 'userName' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Departamento
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('completedLessons')}
                      >
                        Progresso
                        {sortConfig.key === 'completedLessons' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('averageScore')}
                      >
                        Nota Média
                        {sortConfig.key === 'averageScore' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('timeSpent')}
                      >
                        Tempo Gasto
                        {sortConfig.key === 'timeSpent' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('lastActivity')}
                      >
                        Última Atividade
                        {sortConfig.key === 'lastActivity' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('status')}
                      >
                        Status
                        {sortConfig.key === 'status' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedAndFilteredData.map((student) => (
                      <tr key={student.userId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.userEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 flex-grow">
                              <div 
                                className="bg-green-600 h-2.5 rounded-full" 
                                style={{ 
                                  width: `${student.totalLessons > 0 
                                    ? (student.completedLessons / student.totalLessons) * 100 
                                    : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span>
                              {student.completedLessons}/{student.totalLessons}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.completedTests > 0 ? (
                            <span className={`font-medium ${
                              student.averageScore >= 70 ? 'text-green-600' : 
                              student.averageScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                              {student.averageScore.toFixed(1)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                            {formatTimeSpent(student.timeSpent)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(student.lastActivity).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            student.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {student.status === 'completed' ? 'Concluído' : 
                             student.status === 'in_progress' ? 'Em andamento' : 
                             'Não iniciado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentProgressDashboard;
