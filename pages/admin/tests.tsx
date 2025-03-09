import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import Navbar from '../../components/admin/Navbar'
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

interface Test {
  id: string
  title: string
  description: string | null
  timeLimit: number | null
  active: boolean
  sectionsCount?: number
  questionsCount?: number
  createdAt: string
}

const validationSchema = Yup.object({
  title: Yup.string().required('O título do teste é obrigatório'),
  description: Yup.string(),
  timeLimit: Yup.number().min(1, 'O tempo deve ser pelo menos 1 minuto').nullable(),
  active: Yup.boolean(),
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
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/tests')
        if (!response.ok) {
          throw new Error('Erro ao carregar os testes')
        }
        const data = await response.json()
        setTests(data.tests || [])
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar os testes. Por favor, tente novamente.')
        notify.showError('Não foi possível carregar os testes. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchTests()
    }
  }, [status])
  
  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/admin/tests/${currentTest?.id}` : '/api/admin/tests'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro ao ${isEditing ? 'atualizar' : 'criar'} o teste`)
      }
      
      // Atualizar a lista de testes
      const testsResponse = await fetch('/api/admin/tests')
      const testsData = await testsResponse.json()
      setTests(testsData.tests || [])
      
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
  
  const handleDelete = async (id: string) => {
    // Encontrar o teste para mostrar o título na confirmação
    const testToDelete = tests.find(test => test.id === id);
    
    if (!testToDelete) {
      notify.showError('Teste não encontrado');
      return;
    }
    
    // Usar o sistema de notificações para confirmar a exclusão
    notify.confirm(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o teste "${testToDelete.title}"? Esta operação não poderá ser desfeita.`,
      async () => {
        try {
          const response = await fetch(`/api/admin/tests/${id}`, {
            method: 'DELETE',
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Erro ao excluir o teste')
          }
          
          // Atualizar a lista de testes
          setTests(tests.filter(test => test.id !== id))
          
          // Mostrar mensagem de sucesso
          notify.showSuccess('Teste excluído com sucesso!')
        } catch (error) {
          console.error('Erro:', error)
          notify.showError('Ocorreu um erro ao excluir o teste. Por favor, tente novamente.')
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
    setCurrentTest(test)
    setIsEditing(true)
  }
  
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/tests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentActive }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar o status do teste')
      }
      
      // Atualizar o teste na lista
      setTests(tests.map(test => 
        test.id === id ? { ...test, active: !currentActive } : test
      ))
      
      // Mostrar mensagem de sucesso
      notify.showSuccess(`Teste ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`)
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Ocorreu um erro ao atualizar o status do teste. Por favor, tente novamente.')
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
    <div className="min-h-screen bg-secondary-50">
      <Navbar />

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
                  active: currentTest?.active ?? true,
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-secondary-900">{test.title}</div>
                            <div className="text-sm text-secondary-500">{test.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-secondary-900">
                              {test.sectionsCount || 0} seções
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
                            <div className="flex justify-end space-x-2">
                              <Link href={`/admin/test/${test.id}`} className="text-primary-600 hover:text-primary-900">
                                Detalhes
                              </Link>
                              <button
                                onClick={() => handleEdit(test)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleToggleActive(test.id, test.active)}
                                className={`${
                                  test.active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                                }`}
                              >
                                {test.active ? 'Desativar' : 'Ativar'}
                              </button>
                              <button
                                onClick={() => handleDelete(test.id)}
                                className="text-red-600 hover:text-red-900"
                              >
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
    </div>
  )
}

export default Tests
