import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { PlusIcon, DocumentIcon, UserGroupIcon, AcademicCapIcon, CheckCircleIcon, XCircleIcon, PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  issueDate: string;
  expiryDate: string | null;
  certificateNumber: string;
  status: 'valid' | 'expired' | 'revoked';
  downloadUrl: string;
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

const CertificatesPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newCertificate, setNewCertificate] = useState({
    studentId: '',
    courseId: '',
  });

  // Buscar certificados, cursos e alunos
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
      
      // Buscar todos os certificados
      axios.get('/api/admin/training/certificates')
        .then(response => {
          const certificatesData = Array.isArray(response.data) ? response.data : [];
          setCertificates(certificatesData);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar certificados:', err);
          setError('Ocorreu um erro ao buscar os certificados.');
          setLoading(false);
        });
    }
  }, [status, router]);

  // Filtrar certificados com base nos critérios selecionados
  const filteredCertificates = certificates.filter(certificate => {
    const matchesCourse = selectedCourseId ? certificate.courseId === selectedCourseId : true;
    const matchesStudent = selectedStudentId ? certificate.studentId === selectedStudentId : true;
    const matchesStatus = selectedStatus ? certificate.status === selectedStatus : true;
    const matchesSearch = searchTerm 
      ? certificate.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        certificate.course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        certificate.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return matchesCourse && matchesStudent && matchesStatus && matchesSearch;
  });

  // Função para gerar novo certificado
  const handleGenerateCertificate = () => {
    if (!newCertificate.studentId || !newCertificate.courseId) {
      setError('Por favor, selecione um aluno e um curso.');
      return;
    }
    
    setLoading(true);
    axios.post('/api/admin/training/certificates', newCertificate)
      .then(response => {
        // Adicionar o novo certificado à lista
        setCertificates([...certificates, response.data]);
        setShowGenerateModal(false);
        setNewCertificate({ studentId: '', courseId: '' });
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao gerar certificado:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao gerar o certificado.');
        setLoading(false);
      });
  };

  // Função para revogar certificado
  const handleRevokeCertificate = (certificateId: string) => {
    if (confirm('Tem certeza que deseja revogar este certificado?')) {
      setLoading(true);
      axios.patch(`/api/admin/training/certificates/${certificateId}`, { status: 'revoked' })
        .then(() => {
          // Atualizar o status do certificado na lista
          setCertificates(certificates.map(certificate => 
            certificate.id === certificateId 
              ? { ...certificate, status: 'revoked' } 
              : certificate
          ));
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao revogar certificado:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao revogar o certificado.');
          setLoading(false);
        });
    }
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Válido';
      case 'expired':
        return 'Expirado';
      case 'revoked':
        return 'Revogado';
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
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciamento de Certificados</h1>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Gerar Certificado
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
                placeholder="Nome, curso ou número do certificado..."
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
                <option value="valid">Válido</option>
                <option value="expired">Expirado</option>
                <option value="revoked">Revogado</option>
              </select>
            </div>
          </div>
        </div>

        {filteredCertificates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <DocumentIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 mb-2">Nenhum certificado encontrado</h2>
            <p className="text-secondary-500 mb-4">
              {certificates.length === 0 
                ? 'Não há certificados emitidos no sistema.' 
                : 'Nenhum certificado corresponde aos filtros selecionados.'}
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
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
            >
              Gerar Certificado
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCertificates.map(certificate => (
              <div 
                key={certificate.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-xl font-semibold text-secondary-800 line-clamp-1">{certificate.course.name}</h2>
                      <p className="text-secondary-600 text-sm">Certificado #{certificate.certificateNumber}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(certificate.status)}`}>
                      {getStatusText(certificate.status)}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <UserGroupIcon className="h-5 w-5 text-secondary-500 mr-2" />
                      <span className="text-secondary-700 font-medium">Aluno:</span>
                      <span className="text-secondary-600 ml-2">{certificate.student.name}</span>
                    </div>
                    
                    <div className="flex items-center mb-2">
                      <AcademicCapIcon className="h-5 w-5 text-secondary-500 mr-2" />
                      <span className="text-secondary-700 font-medium">Departamento:</span>
                      <span className="text-secondary-600 ml-2">{certificate.student.department}</span>
                    </div>
                    
                    <div className="flex items-center mb-2">
                      <svg className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-secondary-700 font-medium">Emitido em:</span>
                      <span className="text-secondary-600 ml-2">{formatDate(certificate.issueDate)}</span>
                    </div>
                    
                    {certificate.expiryDate && (
                      <div className="flex items-center mb-2">
                        <svg className="h-5 w-5 text-secondary-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-secondary-700 font-medium">Válido até:</span>
                        <span className="text-secondary-600 ml-2">{formatDate(certificate.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-secondary-200 flex justify-between">
                    <a
                      href={certificate.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200 text-sm flex items-center"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download
                    </a>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(`/admin/training/certificates/${certificate.id}/print`, '_blank')}
                        className="px-3 py-2 bg-secondary-50 text-secondary-600 border border-secondary-200 rounded-md hover:bg-secondary-100 transition-colors duration-200 text-sm flex items-center"
                      >
                        <PrinterIcon className="h-4 w-4 mr-2" />
                        Imprimir
                      </button>
                      
                      {certificate.status === 'valid' && (
                        <button
                          onClick={() => handleRevokeCertificate(certificate.id)}
                          className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-200 text-sm flex items-center"
                        >
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Revogar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Geração de Certificado */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary-900">Gerar Novo Certificado</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
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
                value={newCertificate.studentId}
                onChange={(e) => setNewCertificate({ ...newCertificate, studentId: e.target.value })}
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
                value={newCertificate.courseId}
                onChange={(e) => setNewCertificate({ ...newCertificate, courseId: e.target.value })}
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
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition-colors duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateCertificate}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Gerar Certificado
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CertificatesPage;
