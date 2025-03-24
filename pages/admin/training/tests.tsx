import { NextPage } from 'next'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import AdminLayout from '../../../components/admin/AdminLayout'
import { useNotificationSystem } from '../../../hooks/useNotificationSystem';

interface Test {
  id: string
  title: string
  description: string | null
  timeLimit: number | null
  active: boolean
  sectionsCount?: number
  questionsCount?: number
  createdAt: string
  testType: string
}

const validationSchema = Yup.object({
  title: Yup.string().required('O título do teste é obrigatório'),
  description: Yup.string(),
  timeLimit: Yup.number().min(1, 'O tempo deve ser pelo menos 1 minuto').nullable(),
  active: Yup.boolean()
})

const Tests: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const notify = useNotificationSystem();
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentTest, setCurrentTest] = useState<Test | null>(null)
  const hasLoadedTestsRef = useRef(false)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router, notify])
  
  useEffect(() => {
    const fetchTests = async () => {
      try {
        console.log("Iniciando carregamento dos testes de treinamento...");
        setLoading(true);
        
        const response = await fetch('/api/admin/training/tests', {
          // Adicionar cabeçalhos para evitar problemas de cache
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Erro ao carregar os testes');
        }
        
        const data = await response.json();
        console.log(`Testes de treinamento carregados com sucesso: ${data.tests?.length || 0}`);
        setTests(data.tests || []);
      } catch (error) {
        console.error('Erro ao carregar testes:', error);
        setError('Não foi possível carregar os testes. Por favor, tente novamente.');
        notify.showError('Não foi possível carregar os testes. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    // Verificar se já carregamos os testes para evitar loop infinito
    if (status === 'authenticated' && !hasLoadedTestsRef.current) {
      console.log("Carregando testes de treinamento pela primeira vez...");
      hasLoadedTestsRef.current = true; // Marcar como carregado antes de fazer a chamada
      fetchTests();
    } else if (hasLoadedTestsRef.current) {
      console.log("Testes já foram carregados anteriormente, ignorando chamada");
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Removendo notify das dependências para evitar re-renderizações desnecessárias
  
  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/admin/training/tests/${currentTest?.id}` : '/api/admin/training/tests'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} o teste`)
      }
      
      // Atualizar a lista de testes manualmente sem fazer uma nova chamada à API
      const responseData = await response.json();
      const newOrUpdatedTest = responseData.test;
      
      if (isEditing) {
        // Atualizar o teste existente na lista
        setTests(prevTests => 
          prevTests.map(test => 
            test.id === newOrUpdatedTest.id ? newOrUpdatedTest : test
          )
        );
      } else {
        // Adicionar o novo teste à lista
        setTests(prevTests => [...prevTests, newOrUpdatedTest]);
      }
      
      // Limpar o formulário e o estado de edição
      resetForm()
      setIsEditing(false)
      setCurrentTest(null)
      
      // Mostrar mensagem de sucesso
      notify.showSuccess(isEditing ? 'Teste atualizado com sucesso!' : 'Teste criado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError(`Ocorreu um erro ao ${isEditing ? 'atualizar' : 'criar'} o teste. Por favor, tente novamente.`)
    }
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setCurrentTest(null)
  }
  
  const handleDelete = (id: string) => {
    const testToDelete = tests.find(test => test.id === id);
    if (!testToDelete) return;
    
    // Usar o sistema de notificações para confirmar a exclusão
    notify.confirm(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o teste "${testToDelete.title}"? Esta operação não poderá ser desfeita.`,
      async () => {
        try {
          const response = await fetch(`/api/admin/training/tests/${id}`, {
            method: 'DELETE',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir o teste');
          }
          
          // Atualizar a lista de testes localmente
          setTests(tests.filter(test => test.id !== id));
          
          // Mostrar mensagem de sucesso
          notify.showSuccess('Teste excluído com sucesso!');
        } catch (error) {
          console.error('Erro ao excluir teste:', error);
          notify.showError('Ocorreu um erro ao excluir o teste. Por favor, tente novamente.');
        }
      },
      {
        type: 'warning',
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    );
  }
  
  const handleEdit = (test: Test) => {
    setCurrentTest(test);
    setIsEditing(true);
  }
  
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/training/tests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ active: !currentActive }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar o status do teste');
      }
      
      // Atualizar o teste na lista localmente
      setTests(prevTests => prevTests.map(test => 
        test.id === id ? { ...test, active: !currentActive } : test
      ));
      
      // Mostrar mensagem de sucesso
      notify.showSuccess(`Teste ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      notify.showError('Ocorreu um erro ao atualizar o status do teste. Por favor, tente novamente.');
    }
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-700">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-800">Gerenciar Testes</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold text-secondary-800 mb-4">
                {isEditing ? 'Editar Teste' : 'Novo Teste'}
              </h2>
              
              <Formik
                initialValues={{
                  title: currentTest?.title || '',
                  description: currentTest?.description || '',
                  timeLimit: currentTest?.timeLimit || '',
                  active: currentTest?.active ?? true
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1">
                        Título
                      </label>
                      <Field
                        type="text"
                        name="title"
                        id="title"
                        className="w-full p-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Digite o título do teste"
                      />
                      <ErrorMessage name="title" component="div" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                        Descrição
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        id="description"
                        rows={3}
                        className="w-full p-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Digite a descrição do teste"
                      />
                      <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="timeLimit" className="block text-sm font-medium text-secondary-700 mb-1">
                        Tempo Limite (minutos)
                      </label>
                      <Field
                        type="number"
                        name="timeLimit"
                        id="timeLimit"
                        className="w-full p-2 border border-secondary-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Digite o tempo limite em minutos"
                      />
                      <ErrorMessage name="timeLimit" component="div" className="mt-1 text-sm text-red-600" />
                      <p className="mt-1 text-xs text-secondary-500">
                        Deixe em branco para sem limite de tempo
                      </p>
                    </div>

                    <div className="mb-4 flex items-center">
                      <Field
                        type="checkbox"
                        name="active"
                        id="active"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                      />
                      <label htmlFor="active" className="ml-2 block text-sm text-secondary-700">
                        Ativo
                      </label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Título
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Seções/Perguntas
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
                    {tests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-secondary-500">
                          Nenhum teste encontrado
                        </td>
                      </tr>
                    ) : (
                      tests.map((test) => (
                        <tr key={test.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-secondary-900">{test.title}</div>
                            <div className="text-sm text-secondary-500 mt-1 max-w-md break-words">
                              {test.description && test.description.split('\n').map((line, i) => (
                                <span key={i}>
                                  {line}
                                  {i < test.description.split('\n').length - 1 && <br />}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-secondary-900">
                              {test.sectionsCount || 0} etapas
                            </div>
                            <div className="text-sm text-secondary-500">
                              {test.questionsCount || 0} perguntas
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              test.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {test.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex flex-col space-y-1.5 items-end">
                              <Link 
                                href={`/admin/training/test/${test.id}`} 
                                className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200 text-xs font-medium flex items-center w-24 justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                Detalhes
                              </Link>
                              <button
                                onClick={() => handleEdit(test)}
                                className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors duration-200 text-xs font-medium flex items-center w-24 justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleToggleActive(test.id, test.active)}
                                className={`px-2 py-1 rounded-md transition-colors duration-200 text-xs font-medium flex items-center w-24 justify-center ${
                                  test.active 
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                              >
                                {test.active ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                    </svg>
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Ativar
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(test.id)}
                                className="px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors duration-200 text-xs font-medium flex items-center w-24 justify-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Tests
