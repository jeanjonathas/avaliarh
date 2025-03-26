import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, UserGroupIcon, AcademicCapIcon, UserCircleIcon, PencilIcon, TrashIcon, XCircleIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  enrolledCourses: number;
  completedCourses: number;
  averageScore: number;
  status: 'active' | 'inactive';
  lastActivity: string;
}

const TrainingStudents: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
  });
  
  // Buscar alunos quando o componente montar
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      fetchStudents();
    }
  }, [status, router]);
  
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar alunos da API - não precisamos passar parâmetros adicionais, pois a API já usa o companyId do usuário logado
      const response = await axios.get('/api/admin/training/students');
      
      // Verificar se temos dados na resposta
      if (!response.data || response.data.success === false) {
        console.error('Resposta da API não contém dados esperados:', response.data);
        setError(response.data?.error || 'Formato de resposta inválido da API');
        setStudents([]);
        setFilteredStudents([]);
        setLoading(false);
        return;
      }
      
      console.log('Dados recebidos da API:', response.data);
      
      // A API retorna os dados em um formato diferente, com um objeto que contém success, students e pagination
      const studentsData = response.data.students.map((student: any) => ({
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        department: student.user.department || 'Não especificado',
        position: student.user.position || 'Não especificado',
        enrolledCourses: student.courseEnrollments.length,
        completedCourses: student.courseEnrollments.filter((enrollment: any) => enrollment.completionDate).length,
        averageScore: student.courseEnrollments.length > 0 
          ? student.courseEnrollments.reduce((acc: number, curr: any) => acc + curr.progress, 0) / student.courseEnrollments.length 
          : 0,
        status: student.user.status || 'active',
        lastActivity: student.user.lastLoginAt || student.enrollmentDate
      }));
      
      console.log('Dados processados:', studentsData);
      
      setStudents(studentsData);
      setFilteredStudents(studentsData);
      
      // Extrair departamentos únicos para o filtro
      const uniqueDepartmentsSet = new Set(studentsData.map((student: any) => student.department).filter(Boolean));
      const uniqueDepartments = Array.from(uniqueDepartmentsSet) as string[];
      setDepartments(uniqueDepartments);
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
      setError('Ocorreu um erro ao buscar os alunos.');
      setLoading(false);
    }
  };
  
  // Filtrar alunos quando os filtros mudarem
  useEffect(() => {
    if (students.length > 0) {
      const filtered = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             student.position.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter ? student.status === statusFilter : true;
        const matchesDepartment = departmentFilter ? student.department === departmentFilter : true;
        
        return matchesSearch && matchesStatus && matchesDepartment;
      });
      
      setFilteredStudents(filtered);
    }
  }, [searchTerm, statusFilter, departmentFilter, students]);
  
  // Função para adicionar novo aluno
  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email) {
      setError('Por favor, preencha os campos obrigatórios: nome e e-mail.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Fazer chamada à API para adicionar o aluno
      const response = await axios.post('/api/admin/training/students', {
        name: newStudent.name,
        email: newStudent.email,
        department: newStudent.department,
        position: newStudent.position,
      });
      
      if (response.status === 201 && response.data.success) {
        // Limpar o formulário e fechar o modal
        setNewStudent({
          name: '',
          email: '',
          department: '',
          position: '',
        });
        setShowAddModal(false);
        
        // Recarregar a lista de alunos
        await fetchStudents();
        
        // Exibir mensagem de sucesso
        toast.success('Aluno adicionado com sucesso.');
      }
    } catch (error) {
      console.error('Erro ao adicionar aluno:', error);
      let errorMessage = 'Ocorreu um erro ao adicionar o aluno.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para excluir aluno
  const handleDeleteStudent = (studentId: string) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      setLoading(true);
      
      // Em produção, substituir por chamada real à API
      // Simulação de exclusão de aluno
      const updatedStudents = students.filter(student => student.id !== studentId);
      setStudents(updatedStudents);
      setLoading(false);
    }
  };
  
  // Função para alternar o status do aluno
  const toggleStudentStatus = (studentId: string) => {
    setLoading(true);
    
    // Atualizar o status do aluno localmente
    const updatedStudents = students.map(student => {
      if (student.id === studentId) {
        return {
          ...student,
          status: student.status === 'active' ? 'inactive' : 'active'
        };
      }
      return student;
    });
    
    setStudents(updatedStudents as Student[]);
    setLoading(false);
  };
  
  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Função para obter a cor da barra de progresso com base na pontuação
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Função para calcular a porcentagem de conclusão
  const calculateCompletionPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
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
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Alunos</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Novo Aluno
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="Nome, e-mail ou cargo..."
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            {/* Filtro por departamento */}
            <div>
              <label htmlFor="departmentSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                Departamento:
              </label>
              <select
                id="departmentSelect"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os departamentos</option>
                {departments.map((department, index) => (
                  <option key={index} value={department}>
                    {department}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <UserGroupIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum aluno encontrado</h2>
            <p className="text-secondary-500 mb-4">
              {students.length === 0 
                ? 'Não há alunos cadastrados no sistema.' 
                : 'Nenhum aluno corresponde aos filtros selecionados.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDepartmentFilter('');
              }}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium mr-4"
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
            >
              Novo Aluno
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Aluno
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Departamento / Cargo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Média
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Última Atividade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-secondary-900">{student.name}</div>
                            <div className="text-sm text-secondary-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">{student.department}</div>
                        <div className="text-sm text-secondary-500">{student.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900 mb-1">
                          {student.completedCourses}/{student.enrolledCourses} cursos concluídos
                        </div>
                        <div className="w-full bg-secondary-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              student.enrolledCourses > 0 
                                ? calculateCompletionPercentage(student.completedCourses, student.enrolledCourses) >= 80
                                  ? 'bg-green-500'
                                  : calculateCompletionPercentage(student.completedCourses, student.enrolledCourses) >= 40
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                : 'bg-secondary-400'
                            }`} 
                            style={{ width: `${calculateCompletionPercentage(student.completedCourses, student.enrolledCourses)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.averageScore > 0 ? (
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${
                              student.averageScore >= 80 ? 'text-green-600' :
                              student.averageScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {student.averageScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-secondary-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {student.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {formatDate(student.lastActivity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/admin/training/students/${student.id}`)}
                            className="text-primary-600 hover:text-primary-800"
                            title="Ver detalhes"
                          >
                            <UserCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/admin/training/students/${student.id}/edit`)}
                            className="text-secondary-600 hover:text-secondary-800"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => toggleStudentStatus(student.id)}
                            className={`${
                              student.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                            }`}
                            title={student.status === 'active' ? 'Desativar' : 'Ativar'}
                          >
                            {student.status === 'active' ? <XMarkIcon className="h-5 w-5" /> : <CheckIcon className="h-5 w-5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Novo Aluno */}
      {showAddModal && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary-900">Novo Aluno</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-2">
                Nome: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                E-mail: <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="department" className="block text-sm font-medium text-secondary-700 mb-2">
                Departamento:
              </label>
              <input
                type="text"
                id="department"
                value={newStudent.department}
                onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                list="departments"
              />
              <datalist id="departments">
                {departments.map((department, index) => (
                  <option key={index} value={department} />
                ))}
              </datalist>
            </div>
            
            <div className="mb-6">
              <label htmlFor="position" className="block text-sm font-medium text-secondary-700 mb-2">
                Cargo:
              </label>
              <input
                type="text"
                id="position"
                value={newStudent.position}
                onChange={(e) => setNewStudent({ ...newStudent, position: e.target.value })}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default TrainingStudents;
