import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import SuperAdminLayout from '../../components/SuperAdminLayout'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

interface GlobalQuestion {
  id: string
  text: string
  type: string
  difficulty: string
}

interface GlobalTest {
  id: string
  title: string
  description: string | null
  isActive: boolean
  questions: GlobalQuestion[]
  companiesCount: number
  createdAt: string
  updatedAt: string
}

interface Company {
  id: string
  name: string
  plan: string
  isActive: boolean
}

const validationSchema = Yup.object({
  title: Yup.string().required('O título do teste é obrigatório'),
  description: Yup.string(),
  isActive: Yup.boolean(),
  questionIds: Yup.array().min(1, 'Selecione pelo menos uma pergunta'),
})

const GlobalTests: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const notify = useNotificationSystem();
  const [tests, setTests] = useState<GlobalTest[]>([])
  const [questions, setQuestions] = useState<GlobalQuestion[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentTest, setCurrentTest] = useState<GlobalTest | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [deleteTestId, setDeleteTestId] = useState<string | null>(null)
  const [openAccessDialog, setOpenAccessDialog] = useState(false)
  const [accessTestId, setAccessTestId] = useState<string | null>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar perguntas globais
        const questionsResponse = await fetch('/api/superadmin/questions')
        if (!questionsResponse.ok) {
          throw new Error('Erro ao carregar perguntas')
        }
        const questionsData = await questionsResponse.json()
        setQuestions(questionsData)
        
        // Buscar testes globais
        const testsResponse = await fetch('/api/superadmin/global-tests')
        if (!testsResponse.ok) {
          throw new Error('Erro ao carregar testes')
        }
        const testsData = await testsResponse.json()
        setTests(testsData)
        
        // Buscar empresas
        const companiesResponse = await fetch('/api/superadmin/companies')
        if (!companiesResponse.ok) {
          throw new Error('Erro ao carregar empresas')
        }
        const companiesData = await companiesResponse.json()
        setCompanies(companiesData)
      } catch (error) {
        console.error('Erro:', error)
        setError('Falha ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    
    if (session) {
      fetchData()
    }
  }, [session])
  
  const handleAddTest = async (values: any, { resetForm }: any) => {
    try {
      const testData = {
        title: values.title,
        description: values.description,
        isActive: values.isActive,
        questionIds: values.questionIds,
      }
      
      const response = await fetch('/api/superadmin/global-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar teste')
      }
      
      const newTest = await response.json()
      setTests([...tests, newTest])
      resetForm()
      notify.showSuccess('Teste global adicionado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao adicionar teste global')
    }
  }
  
  const handleUpdateTest = async (values: any, { resetForm }: any) => {
    if (!currentTest) return
    
    try {
      const testData = {
        title: values.title,
        description: values.description,
        isActive: values.isActive,
        questionIds: values.questionIds,
      }
      
      const response = await fetch(`/api/superadmin/global-tests/${currentTest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar teste')
      }
      
      const updatedTest = await response.json()
      setTests(
        tests.map((t) =>
          t.id === updatedTest.id ? updatedTest : t
        )
      )
      
      setIsEditing(false)
      setCurrentTest(null)
      resetForm()
      notify.showSuccess('Teste global atualizado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao atualizar teste global')
    }
  }
  
  const confirmDeleteTest = (id: string) => {
    setDeleteTestId(id)
    setOpenDeleteDialog(true)
  }
  
  const handleDeleteTest = async () => {
    if (!deleteTestId) return
    
    try {
      const response = await fetch(`/api/superadmin/global-tests/${deleteTestId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir teste')
      }
      
      setTests(tests.filter((t) => t.id !== deleteTestId))
      notify.showSuccess('Teste global excluído com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao excluir teste global')
    } finally {
      setOpenDeleteDialog(false)
      setDeleteTestId(null)
    }
  }
  
  const handleEditTest = (test: GlobalTest) => {
    setCurrentTest(test)
    setIsEditing(true)
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentTest(null)
  }
  
  const openCompanyAccess = async (testId: string) => {
    try {
      // Buscar empresas que já têm acesso a este teste
      const response = await fetch(`/api/superadmin/global-tests/${testId}/access`)
      if (!response.ok) {
        throw new Error('Erro ao carregar dados de acesso')
      }
      
      const accessData = await response.json()
      setSelectedCompanies(accessData.map((access: any) => access.companyId))
      setAccessTestId(testId)
      setOpenAccessDialog(true)
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao carregar dados de acesso')
    }
  }
  
  const handleCompanySelection = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }
  
  const saveCompanyAccess = async () => {
    if (!accessTestId) return
    
    try {
      const response = await fetch(`/api/superadmin/global-tests/${accessTestId}/access`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyIds: selectedCompanies }),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar acesso')
      }
      
      notify.showSuccess('Acesso ao teste atualizado com sucesso!')
      
      // Atualizar a contagem de empresas no teste
      const updatedTests = tests.map(test => {
        if (test.id === accessTestId) {
          return { ...test, companiesCount: selectedCompanies.length }
        }
        return test
      })
      
      setTests(updatedTests)
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao atualizar acesso ao teste')
    } finally {
      setOpenAccessDialog(false)
      setAccessTestId(null)
    }
  }
  
  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Testes Globais</h1>
        
        <div className="mb-6 flex justify-between items-center">
          <div className="space-x-4">
            <Link href="/superadmin/categories">
              <a className="text-indigo-600 hover:text-indigo-900">
                Gerenciar Categorias
              </a>
            </Link>
            <Link href="/superadmin/questions">
              <a className="text-indigo-600 hover:text-indigo-900">
                Gerenciar Perguntas
              </a>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Teste Global' : 'Adicionar Novo Teste Global'}
              </h2>
              
              <Formik
                initialValues={
                  isEditing && currentTest
                    ? {
                        title: currentTest.title,
                        description: currentTest.description || '',
                        isActive: currentTest.isActive,
                        questionIds: currentTest.questions.map(q => q.id),
                      }
                    : {
                        title: '',
                        description: '',
                        isActive: true,
                        questionIds: [],
                      }
                }
                validationSchema={validationSchema}
                onSubmit={isEditing ? handleUpdateTest : handleAddTest}
                enableReinitialize
              >
                {({ values, isSubmitting }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Título do Teste
                      </label>
                      <Field
                        type="text"
                        name="title"
                        id="title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="title" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        id="description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center">
                        <Field
                          type="checkbox"
                          name="isActive"
                          id="isActive"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                          Teste Ativo
                        </label>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Perguntas
                      </label>
                      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {questions.length === 0 ? (
                          <p className="text-sm text-gray-500">Nenhuma pergunta disponível</p>
                        ) : (
                          questions.map((question) => (
                            <div key={question.id} className="flex items-start mb-2 pb-2 border-b border-gray-100">
                              <div className="flex items-center h-5">
                                <Field
                                  type="checkbox"
                                  name="questionIds"
                                  value={question.id}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </div>
                              <div className="ml-3 text-sm">
                                <label className="font-medium text-gray-700">{question.text}</label>
                                <p className="text-gray-500 text-xs mt-1">
                                  {question.type === 'MULTIPLE_CHOICE' ? 'Múltipla Escolha' : 'Opinativa'} | 
                                  {question.difficulty === 'EASY' ? ' Fácil' : 
                                   question.difficulty === 'MEDIUM' ? ' Médio' : ' Difícil'}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <ErrorMessage name="questionIds" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {isEditing ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Testes Globais Existentes</h2>
              
              {loading ? (
                <p className="text-center py-4">Carregando testes...</p>
              ) : error ? (
                <p className="text-center text-red-600 py-4">{error}</p>
              ) : tests.length === 0 ? (
                <p className="text-center py-4">Nenhum teste global encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Título
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Perguntas
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresas
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tests.map((test) => (
                        <tr key={test.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{test.title}</div>
                            <div className="text-xs text-gray-500">{test.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              test.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {test.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{test.questions.length}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{test.companiesCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditTest(test)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => openCompanyAccess(test.id)}
                              className="text-green-600 hover:text-green-900 mr-2"
                            >
                              Acesso
                            </button>
                            <button
                              onClick={() => confirmDeleteTest(test.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir este teste global? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteTest} color="primary" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de gerenciamento de acesso */}
      <Dialog
        open={openAccessDialog}
        onClose={() => setOpenAccessDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gerenciar Acesso ao Teste Global</DialogTitle>
        <DialogContent>
          <DialogContentText className="mb-4">
            Selecione as empresas que terão acesso a este teste global:
          </DialogContentText>
          
          <div className="max-h-96 overflow-y-auto">
            {companies.length === 0 ? (
              <p className="text-center py-4">Nenhuma empresa disponível</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center p-2 border rounded">
                    <input
                      type="checkbox"
                      id={`company-${company.id}`}
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => handleCompanySelection(company.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`company-${company.id}`} className="ml-2 block">
                      <span className="text-sm font-medium text-gray-700">{company.name}</span>
                      <span className="block text-xs text-gray-500">
                        Plano: {company.plan} | 
                        Status: {company.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAccessDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={saveCompanyAccess} color="primary" autoFocus>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  )
}

export default GlobalTests
