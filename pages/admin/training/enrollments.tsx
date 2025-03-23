import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, UserGroupIcon, AcademicCapIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  lastAccessDate: string;
  completionDate: string | null;
  student: {
    name: string;
    email: string;
    department: string;
  };
  course: {
    name: string;
    duration: number;
  };
}

interface Course {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

const EnrollmentsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEnrollment, setNewEnrollment] = useState({
    studentId: '',
    courseId: '',
  });

  // Buscar matrículas, cursos e alunos
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todos os cursos
      axios.get('/api/admin/training/courses')
        .then(response => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError('Ocorreu um erro ao buscar os cursos.');
        });
      
      // Buscar todos os alunos
      axios.get('/api/admin/training/students')
        .then(response => {
          const studentsData = Array.isArray(response.data) ? response.data : [];
          setStudents(studentsData);
        })
        .catch(err => {
          console.error('Erro ao buscar alunos:', err);
          setError('Ocorreu um erro ao buscar os alunos.');
        });
      
      // Buscar todas as matrículas
      axios.get('/api/admin/training/enrollments')
        .then(response => {
          const enrollmentsData = Array.isArray(response.data) ? response.data : [];
          setEnrollments(enrollmentsData);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar matrículas:', err);
          setError('Ocorreu um erro ao buscar as matrículas.');
          setLoading(false);
        });
    }
  }, [status, router]);

  // Filtrar matrículas com base nos critérios selecionados
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesCourse = selectedCourseId ? enrollment.courseId === selectedCourseId : true;
    const matchesStudent = selectedStudentId ? enrollment.studentId === selectedStudentId : true;
    const matchesStatus = selectedStatus ? enrollment.status === selectedStatus : true;
    const matchesSearch = searchTerm 
      ? enrollment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        enrollment.course.name.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return matchesCourse && matchesStudent && matchesStatus && matchesSearch;
  });

  // Função para adicionar nova matrícula
  const handleAddEnrollment = () => {
    if (!newEnrollment.studentId || !newEnrollment.courseId) {
      setError('Por favor, selecione um aluno e um curso.');
      return;
    }
    
    setLoading(true);
    axios.post('/api/admin/training/enrollments', newEnrollment)
      .then(response => {
        // Adicionar a nova matrícula à lista
        setEnrollments([...enrollments, response.data]);
        setShowAddModal(false);
        setNewEnrollment({ studentId: '', courseId: '' });
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao adicionar matrícula:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao adicionar a matrícula.');
        setLoading(false);
      });
  };

  // Função para cancelar matrícula
  const handleCancelEnrollment = (enrollmentId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta matrícula?')) {
      setLoading(true);
      axios.patch(`/api/admin/training/enrollments/${enrollmentId}`, { status: 'cancelled' })
        .then(() => {
          // Atualizar o status da matrícula na lista
          setEnrollments(enrollments.map(enrollment => 
            enrollment.id === enrollmentId 
              ? { ...enrollment, status: 'cancelled' } 
              : enrollment
          ));
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao cancelar matrícula:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao cancelar a matrícula.');
          setLoading(false);
        });
    }
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Desconhecido';
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout activeSection="treinamento">
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-600">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <AdminLayout activeSection="treinamento">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        <ContextualNavigation 
          prevLink={contextualNav.prev} 
          nextLink={contextualNav.next} 
          relatedLinks={contextualNav.related} 
        />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Matrículas</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nova Matrícula
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por texto */}
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-secondary-700 mb-2">
                Buscar:
              </label>
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome do aluno ou curso..."
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Filtro por curso */}
            <div>
              <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Curso:
              </label>
              <select
                id="courseSelect"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os cursos</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por aluno */}
            <div>
              <label htmlFor="studentSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Aluno:
              </label>
              <select
                id="studentSelect"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os alunos</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filtro por status */}
            <div>
              <label htmlFor="statusSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Status:
              </label>
              <select
                id="statusSelect"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativa</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>
        </div>

        {filteredEnrollments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <UserGroupIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhuma matrícula encontrada</h2>
            <p className="text-secondary-500 mb-4">
              {enrollments.length === 0 
                ? 'Não há matrículas cadastradas no sistema.' 
                : 'Nenhuma matrícula corresponde aos filtros selecionados.'}
            </p>
            <button
              onClick={() => {
                setSelectedCourseId('');
                setSelectedStudentId('');
                setSelectedStatus('');
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium mr-4"
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
            >
              Nova Matrícula
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Aluno
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Curso
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Data de Matrícula
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Progresso
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {filteredEnrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <UserGroupIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-secondary-900">{enrollment.student.name}</div>
                          <div className="text-sm text-secondary-500">{enrollment.student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-secondary-900">{enrollment.course.name}</div>
                      <div className="text-sm text-secondary-500">{enrollment.student.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-600">{formatDate(enrollment.enrollmentDate)}</div>
                      <div className="text-xs text-secondary-500">
                        Último acesso: {formatDate(enrollment.lastAccessDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-2">
                          <span className="text-sm font-medium text-secondary-700">{enrollment.progress}%</span>
                        </div>
                        <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              enrollment.status === 'completed' 
                                ? 'bg-green-600' 
                                : enrollment.status === 'cancelled' 
                                  ? 'bg-red-600' 
                                  : 'bg-blue-600'
                            }`}
                            style={{ width: `${enrollment.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                        {getStatusText(enrollment.status)}
                      </span>
                      {enrollment.completionDate && (
                        <div className="text-xs text-secondary-500 mt-1">
                          Concluído em: {formatDate(enrollment.completionDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/training/enrollments/${enrollment.id}`}
                        className="text-primary-600 hover:text-primary-800 mr-3"
                      >
                        Detalhes
                      </Link>
                      {enrollment.status === 'active' && (
                        <button
                          onClick={() => handleCancelEnrollment(enrollment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Nova Matrícula */}
      {showAddModal && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary-900">Nova Matrícula</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="studentId" className="block text-sm font-medium text-secondary-700 mb-2">
                Aluno:
              </label>
              <select
                id="studentId"
                value={newEnrollment.studentId}
                onChange={(e) => setNewEnrollment({ ...newEnrollment, studentId: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Selecione um aluno</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label htmlFor="courseId" className="block text-sm font-medium text-secondary-700 mb-2">
                Curso:
              </label>
              <select
                id="courseId"
                value={newEnrollment.courseId}
                onChange={(e) => setNewEnrollment({ ...newEnrollment, courseId: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Selecione um curso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddEnrollment}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Matricular
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default EnrollmentsPage;
