import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../../../components/admin/AdminLayout';
import { 
  UserIcon, 
  ArrowLeftIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import StudentCredentialsManager from '../../../../components/admin/training/StudentCredentialsManager';
import StudentCourseProgress from '../../../../components/admin/training/StudentCourseProgress';
import StudentAccessLogs from '../../../../components/admin/training/StudentAccessLogs';
import StudentTestResults from '../../../../components/admin/training/StudentTestResults';
import StudentEnrollmentManager from '../../../../components/admin/training/StudentEnrollmentManager';

interface Student {
  id: string;
  userId: string;
  enrollmentDate: string;
  progress: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    password?: string;
    company?: {
      id: string;
      name: string;
    };
  };
}

interface CourseEnrollment {
  id: string;
  courseId: string;
  enrollmentDate: string;
  completionDate?: string;
  progress: number;
  course: {
    id: string;
    name: string;
    description?: string;
  };
}

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

interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  maxScore: number;
  startTime: string;
  endTime: string;
  passed: boolean;
  test: {
    id: string;
    title: string;
    moduleId: string;
    module: {
      name: string;
      courseId: string;
      course: {
        name: string;
      };
    };
  };
}

interface Course {
  id: string;
  name: string;
  description?: string;
}

interface StudentData {
  student: Student;
  enrollments: CourseEnrollment[];
  accessLogs: AccessLog[];
  testAttempts?: TestAttempt[];
  availableCourses: Course[];
}

const StudentDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Buscar dados do estudante
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`/api/admin/training/students/${id}`);
        setStudentData(response.data);
      } catch (error) {
        console.error('Erro ao buscar dados do estudante:', error);
        setError('Não foi possível carregar os dados do estudante. Tente novamente mais tarde.');
        toast.error('Erro ao carregar dados do estudante');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [id, refreshTrigger]);

  // Função para atualizar os dados após uma matrícula
  const handleEnrollmentChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Renderizar estado de carregamento
  if (loading) {
    return (
      <AdminLayout>
        <Head>
          <title>Carregando Detalhes do Aluno | AvaliaRH</title>
        </Head>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-secondary-600">Carregando dados do aluno...</p>
        </div>
      </AdminLayout>
    );
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <AdminLayout>
        <Head>
          <title>Erro | AvaliaRH</title>
        </Head>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <p>{error}</p>
          </div>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Tentar Novamente
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Renderizar quando não há dados
  if (!studentData) {
    return (
      <AdminLayout>
        <Head>
          <title>Aluno Não Encontrado | AvaliaRH</title>
        </Head>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-secondary-600 mb-4">Aluno não encontrado</p>
          <button
            onClick={() => router.push('/admin/training/students')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Voltar para Lista de Alunos
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { student, enrollments, accessLogs, availableCourses } = studentData;
  const testAttempts = studentData.testAttempts || [];

  // Verificar se o usuário tem senha definida
  const hasPassword = !!student.user.password && student.user.password !== '';

  return (
    <AdminLayout>
      <Head>
        <title>{student.user.name} | Detalhes do Aluno | AvaliaRH</title>
      </Head>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <button
            onClick={() => router.push('/admin/training/students')}
            className="mr-4 p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-secondary-900">Detalhes do Aluno</h1>
        </div>
      </div>

      {/* Informações do Aluno */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-primary-600" />
            </div>
          </div>
          
          <div className="flex-grow">
            <h2 className="text-xl font-semibold text-secondary-900 mb-2">{student.user.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-secondary-700">
                <EnvelopeIcon className="w-5 h-5 mr-2 text-secondary-500" />
                {student.user.email}
              </div>
              
              {student.user.company && (
                <div className="flex items-center text-secondary-700">
                  <BuildingOfficeIcon className="w-5 h-5 mr-2 text-secondary-500" />
                  {student.user.company.name}
                </div>
              )}
              
              <div className="flex items-center text-secondary-700">
                <CalendarIcon className="w-5 h-5 mr-2 text-secondary-500" />
                Matrícula: {new Date(student.enrollmentDate).toLocaleDateString('pt-BR')}
              </div>
              
              <div className="flex items-center text-secondary-700">
                <div className="w-5 h-5 mr-2 flex items-center justify-center">
                  <span className="text-primary-600 font-bold">%</span>
                </div>
                Progresso Geral: {Math.round(student.progress)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gerenciador de Credenciais */}
      <StudentCredentialsManager 
        studentId={student.id}
        userId={student.userId}
        email={student.user.email}
        hasPassword={hasPassword}
      />

      {/* Gerenciador de Matrículas */}
      <StudentEnrollmentManager 
        studentId={student.id}
        onEnrollmentChange={handleEnrollmentChange}
      />

      {/* Progresso nos Cursos */}
      <StudentCourseProgress enrollments={enrollments} />

      {/* Resultados de Testes */}
      <StudentTestResults testAttempts={testAttempts} />

      {/* Acessos Recentes */}
      <StudentAccessLogs accessLogs={accessLogs} />
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default StudentDetailPage;
