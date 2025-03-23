import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import ModuleFormModal from '../../../../components/admin/training/ModuleFormModal';
import DeleteModuleModal from '../../../../components/admin/training/DeleteModuleModal';
import ModuleReorderModal from '../../../../components/admin/training/ModuleReorderModal';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function CourseDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Estados para os modais de módulos
  const [moduleFormModalOpen, setModuleFormModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [deleteModuleModalOpen, setDeleteModuleModalOpen] = useState(false);
  const [reorderModuleModalOpen, setReorderModuleModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated' && id) {
      // Fetch course data
      setLoading(true);
      setError(null);
      
      axios.get(`/api/admin/training/courses/${id}`)
        .then(response => {
          setCourse(response.data);
        })
        .catch(err => {
          console.error('Erro ao carregar dados do curso:', err);
          setError(err.response?.data?.error || 'Ocorreu um erro ao carregar os dados do curso. Por favor, tente novamente.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [status, router, id]);

  const handleDeleteCourse = async () => {
    try {
      setDeleting(true);
      const response = await axios.delete(`/api/admin/training/courses/${id}`);

      if (response.status !== 200) {
        const data = response.data;
        if (data.error === 'Course has enrolled students') {
          toast.error('Não é possível excluir um curso com alunos matriculados');
        } else {
          toast.error('Ocorreu um erro ao excluir o curso');
        }
        return;
      }

      toast.success('Curso excluído com sucesso');
      router.push('/admin/training');
    } catch (error) {
      toast.error('Ocorreu um erro ao excluir o curso');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!course) {
    return (
      <AdminLayout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => router.back()}
                className="mr-4 text-primary-600 hover:text-primary-900"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Curso não encontrado</h1>
            </div>
            <div className="mt-4">
              <p className="text-gray-500">O curso solicitado não foi encontrado ou você não tem permissão para acessá-lo.</p>
              <Link 
                href="/admin/training" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Voltar para Treinamentos
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>{course.name} | AvaliaRH</title>
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center">
            <Link
              href="/admin/training"
              className="mr-4 text-primary-600 hover:text-primary-900"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">{course.name}</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-8">
          {/* Course Header */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Detalhes do Curso</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Informações e estatísticas do curso</p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/admin/training/courses/${course.id}/edit`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                  Excluir
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Nome</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{course.name}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Descrição</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{course.description || 'Sem descrição'}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Setor</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{course.sectorName || 'Sem setor'}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Data de criação</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(course.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Configurações</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <ul className="space-y-1">
                      <li className="flex items-center">
                        <span className={`h-4 w-4 rounded-full flex items-center justify-center ${course.showResults ? 'bg-green-100' : 'bg-red-100'}`}>
                          <span className={`h-2 w-2 rounded-full ${course.showResults ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        </span>
                        <span className="ml-2">
                          {course.showResults ? 'Mostrar resultados para os alunos' : 'Não mostrar resultados para os alunos'}
                        </span>
                      </li>
                      <li className="flex items-center">
                        <span className={`h-4 w-4 rounded-full flex items-center justify-center ${course.finalTestRequired ? 'bg-green-100' : 'bg-red-100'}`}>
                          <span className={`h-2 w-2 rounded-full ${course.finalTestRequired ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        </span>
                        <span className="ml-2">
                          {course.finalTestRequired ? 'Teste final obrigatório' : 'Teste final não obrigatório'}
                        </span>
                      </li>
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {/* Total Modules */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 110 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total de Módulos</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{course.totalModules}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Lessons */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total de Lições</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{course.totalLessons}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Students */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Alunos Matriculados</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{course.totalStudents}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Taxa de Conclusão</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{course.completionRate}%</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modules Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Módulos</h3>
              <div className="flex space-x-2">
                {course.modules.length > 0 && (
                  <button
                    onClick={() => setReorderModuleModalOpen(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <ArrowsUpDownIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                    Reordenar
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedModule(null);
                    setModuleFormModalOpen(true);
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                  Novo Módulo
                </button>
              </div>
            </div>
            
            {course.modules.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum módulo encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece criando um novo módulo para este curso.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setSelectedModule(null);
                      setModuleFormModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Novo Módulo
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {course.modules.map((module: any) => (
                  <li key={module.id}>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-600 mr-3">
                              {module.order}
                            </div>
                            <Link href={`/admin/training/modules/${module.id}`} className="text-sm font-medium text-primary-600 truncate">
                              {module.name}
                            </Link>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedModule(module);
                                setModuleFormModalOpen(true);
                              }}
                              className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              <PencilIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedModule(module);
                                setDeleteModuleModalOpen(true);
                              }}
                              className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-500 hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <TrashIcon className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <Link href={`/admin/training/modules/${module.id}`}>
                              <span className="inline-flex items-center p-1 border border-transparent rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                            </Link>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              {module.totalLessons || 0} lições
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>
                              Atualizado em {new Date(module.updatedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Delete Course Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Excluir curso</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir este curso? Todos os módulos, lições e dados associados serão permanentemente removidos. Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteCourse}
                  disabled={deleting}
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Form Modal */}
      <ModuleFormModal
        isOpen={moduleFormModalOpen}
        onClose={() => setModuleFormModalOpen(false)}
        courseId={course?.id}
        module={selectedModule}
        onSuccess={() => {
          // Recarregar os dados do curso após criar/editar um módulo
          if (course?.id) {
            setLoading(true);
            axios.get(`/api/admin/training/courses/${course.id}`)
              .then(response => {
                setCourse(response.data);
              })
              .catch(err => {
                console.error('Erro ao recarregar dados do curso:', err);
                setError(err.response?.data?.error || 'Ocorreu um erro ao recarregar os dados do curso.');
              })
              .finally(() => {
                setLoading(false);
              });
          }
        }}
      />

      {/* Delete Module Modal */}
      <DeleteModuleModal
        isOpen={deleteModuleModalOpen}
        onClose={() => setDeleteModuleModalOpen(false)}
        moduleId={selectedModule?.id}
        moduleName={selectedModule?.name}
        onSuccess={() => {
          // Recarregar os dados do curso após excluir um módulo
          if (course?.id) {
            setLoading(true);
            axios.get(`/api/admin/training/courses/${course.id}`)
              .then(response => {
                setCourse(response.data);
              })
              .catch(err => {
                console.error('Erro ao recarregar dados do curso:', err);
                setError(err.response?.data?.error || 'Ocorreu um erro ao recarregar os dados do curso.');
              })
              .finally(() => {
                setLoading(false);
              });
          }
        }}
      />

      {/* Reorder Modules Modal */}
      <ModuleReorderModal
        isOpen={reorderModuleModalOpen}
        onClose={() => setReorderModuleModalOpen(false)}
        courseId={course?.id}
        modules={course?.modules || []}
        onSuccess={() => {
          // Recarregar os dados do curso após reordenar os módulos
          if (course?.id) {
            setLoading(true);
            axios.get(`/api/admin/training/courses/${course.id}`)
              .then(response => {
                setCourse(response.data);
              })
              .catch(err => {
                console.error('Erro ao recarregar dados do curso:', err);
                setError(err.response?.data?.error || 'Ocorreu um erro ao recarregar os dados do curso.');
              })
              .finally(() => {
                setLoading(false);
              });
          }
        }}
      />
    </AdminLayout>
  );
}
