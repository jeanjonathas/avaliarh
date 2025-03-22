import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PlusIcon, UserIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';

interface User {
  id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  enrolled?: boolean;
}

interface Course {
  id: string;
  name: string;
}

interface EnrollmentInterfaceProps {
  courseId?: string;
}

const EnrollmentInterface: React.FC<EnrollmentInterfaceProps> = ({ courseId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  // Fetch users and their enrollment status
  const fetchUsers = useCallback(async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/admin/training/enrollments?courseId=${selectedCourseId}`);
      setUsers(response.data);
      
      // Create enrollment status map
      const statusMap: Record<string, boolean> = {};
      response.data.forEach((user: User) => {
        statusMap[user.id] = !!user.enrolled;
      });
      setEnrollmentStatus(statusMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchUsers();
    }
  }, [selectedCourseId, fetchUsers]);

  // Handle enrollment toggle
  const handleEnrollmentToggle = async (userId: string) => {
    try {
      const isCurrentlyEnrolled = enrollmentStatus[userId];
      
      // Optimistic UI update
      setEnrollmentStatus(prev => ({
        ...prev,
        [userId]: !isCurrentlyEnrolled
      }));
      
      // API call to update enrollment
      await axios.post('/api/admin/training/enrollments', {
        userId,
        courseId: selectedCourseId,
        action: isCurrentlyEnrolled ? 'unenroll' : 'enroll'
      });
      
      // Show success notification
      setNotification({
        message: `Usuário ${isCurrentlyEnrolled ? 'removido do' : 'matriculado no'} curso com sucesso!`,
        type: 'success'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      
      // Revert optimistic update
      setEnrollmentStatus(prev => ({
        ...prev,
        [userId]: !enrollmentStatus[userId]
      }));
      
      // Show error notification
      setNotification({
        message: 'Erro ao atualizar matrícula. Tente novamente.',
        type: 'error'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  // Filter users based on search term and enrollment status
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (showEnrolledOnly) {
      return matchesSearch && enrollmentStatus[user.id];
    }
    
    return matchesSearch;
  });

  // Batch enrollment functions
  const enrollAll = async () => {
    if (!selectedCourseId) return;
    
    try {
      await axios.post('/api/admin/training/enrollments/batch', {
        courseId: selectedCourseId,
        action: 'enroll',
        userIds: filteredUsers.map(user => user.id)
      });
      
      // Update local state
      const newStatus = { ...enrollmentStatus };
      filteredUsers.forEach(user => {
        newStatus[user.id] = true;
      });
      setEnrollmentStatus(newStatus);
      
      setNotification({
        message: 'Todos os usuários foram matriculados com sucesso!',
        type: 'success'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error batch enrolling users:', error);
      setNotification({
        message: 'Erro ao matricular usuários. Tente novamente.',
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  const unenrollAll = async () => {
    if (!selectedCourseId) return;
    
    try {
      await axios.post('/api/admin/training/enrollments/batch', {
        courseId: selectedCourseId,
        action: 'unenroll',
        userIds: filteredUsers.filter(user => enrollmentStatus[user.id]).map(user => user.id)
      });
      
      // Update local state
      const newStatus = { ...enrollmentStatus };
      filteredUsers.forEach(user => {
        newStatus[user.id] = false;
      });
      setEnrollmentStatus(newStatus);
      
      setNotification({
        message: 'Todos os usuários foram desmatriculados com sucesso!',
        type: 'success'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error batch unenrolling users:', error);
      setNotification({
        message: 'Erro ao desmatricular usuários. Tente novamente.',
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Gerenciamento de Matrículas</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Matricule ou remova usuários dos cursos de treinamento
        </p>
      </div>
      
      {/* Notification */}
      {notification && (
        <div className={`px-4 py-3 ${notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
              ) : (
                <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      )}
      
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
        
        {/* Search and filters */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="w-full sm:w-1/2">
            <label htmlFor="search" className="sr-only">
              Buscar usuários
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
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
            <Switch.Group as="div" className="flex items-center">
              <Switch
                checked={showEnrolledOnly}
                onChange={setShowEnrolledOnly}
                className={`${
                  showEnrolledOnly ? 'bg-primary-600' : 'bg-gray-200'
                } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                disabled={loading}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    showEnrolledOnly ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                />
              </Switch>
              <Switch.Label as="span" className="ml-3">
                <span className="text-sm font-medium text-gray-900">Mostrar apenas matriculados</span>
              </Switch.Label>
            </Switch.Group>
          </div>
        </div>
        
        {/* Batch actions */}
        <div className="mb-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={enrollAll}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={loading || !selectedCourseId || filteredUsers.length === 0}
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
            Matricular Todos
          </button>
          <button
            type="button"
            onClick={unenrollAll}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={loading || !selectedCourseId || filteredUsers.filter(user => enrollmentStatus[user.id]).length === 0}
          >
            <XMarkIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
            Remover Todos
          </button>
        </div>
        
        {/* Users list */}
        {loading ? (
          <div className="py-10 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Selecione um curso para ver os usuários disponíveis.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Departamento
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cargo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.role || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            enrollmentStatus[user.id] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {enrollmentStatus[user.id] ? 'Matriculado' : 'Não matriculado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEnrollmentToggle(user.id)}
                            className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded ${
                              enrollmentStatus[user.id]
                                ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                                : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                            }`}
                          >
                            {enrollmentStatus[user.id] ? (
                              <>
                                <XMarkIcon className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
                                Remover
                              </>
                            ) : (
                              <>
                                <PlusIcon className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />
                                Matricular
                              </>
                            )}
                          </button>
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

export default EnrollmentInterface;
