import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import SuperAdminLayout from '../../components/SuperAdminLayout'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

interface Category {
  id: string
  name: string
}

interface Option {
  id?: string
  text: string
  isCorrect: boolean
}

interface Question {
  id: string
  text: string
  type: string
  difficulty: string
  categories: Category[]
  options: Option[]
}

const validationSchema = Yup.object({
  text: Yup.string().required('Texto da pergunta é obrigatório'),
  type: Yup.string().required('Tipo da pergunta é obrigatório'),
  difficulty: Yup.string().required('Nível de dificuldade é obrigatório'),
  categoryIds: Yup.array().min(1, 'Selecione pelo menos uma categoria'),
  options: Yup.array()
    .of(
      Yup.object({
        text: Yup.string().required('Texto da opção é obrigatório'),
        isCorrect: Yup.boolean(),
      })
    )
    .min(2, 'Pelo menos 2 opções são necessárias')
    .test(
      'one-correct',
      'Pelo menos uma opção deve ser marcada como correta',
      (options) => options?.some((option) => option.isCorrect)
    ),
})

const GlobalQuestions: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const notify = useNotificationSystem();
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar categorias
        const categoriesResponse = await fetch('/api/superadmin/categories')
        if (!categoriesResponse.ok) {
          throw new Error('Erro ao carregar categorias')
        }
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)
        
        // Buscar perguntas
        const questionsResponse = await fetch('/api/superadmin/questions')
        if (!questionsResponse.ok) {
          throw new Error('Erro ao carregar perguntas')
        }
        const questionsData = await questionsResponse.json()
        setQuestions(questionsData)
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
  
  const handleAddQuestion = async (values: any, { resetForm }: any) => {
    try {
      const questionData = {
        text: values.text,
        type: values.type,
        difficulty: values.difficulty,
        categoryIds: values.categoryIds,
        options: values.options,
        isGlobal: true
      }
      
      const response = await fetch('/api/superadmin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar pergunta')
      }
      
      const newQuestion = await response.json()
      setQuestions([...questions, newQuestion])
      resetForm()
      notify.showSuccess('Pergunta adicionada com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao adicionar pergunta')
    }
  }
  
  const handleUpdateQuestion = async (values: any, { resetForm }: any) => {
    if (!currentQuestion) return
    
    try {
      const questionData = {
        text: values.text,
        type: values.type,
        difficulty: values.difficulty,
        categoryIds: values.categoryIds,
        options: values.options,
        isGlobal: true
      }
      
      const response = await fetch(`/api/superadmin/questions/${currentQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar pergunta')
      }
      
      const updatedQuestion = await response.json()
      setQuestions(
        questions.map((q) =>
          q.id === updatedQuestion.id ? updatedQuestion : q
        )
      )
      
      setIsEditing(false)
      setCurrentQuestion(null)
      resetForm()
      notify.showSuccess('Pergunta atualizada com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao atualizar pergunta')
    }
  }
  
  const confirmDeleteQuestion = (id: string) => {
    setDeleteQuestionId(id)
    setOpenDeleteDialog(true)
  }
  
  const handleDeleteQuestion = async () => {
    if (!deleteQuestionId) return
    
    try {
      const response = await fetch(`/api/superadmin/questions/${deleteQuestionId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir pergunta')
      }
      
      setQuestions(questions.filter((q) => q.id !== deleteQuestionId))
      notify.showSuccess('Pergunta excluída com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao excluir pergunta')
    } finally {
      setOpenDeleteDialog(false)
      setDeleteQuestionId(null)
    }
  }
  
  const handleEditQuestion = (question: Question) => {
    setCurrentQuestion(question)
    setIsEditing(true)
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentQuestion(null)
  }
  
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'Fácil'
      case 'MEDIUM':
        return 'Médio'
      case 'HARD':
        return 'Difícil'
      default:
        return difficulty
    }
  }
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Múltipla Escolha'
      case 'OPINION_MULTIPLE':
        return 'Opinativa'
      default:
        return type
    }
  }
  
  const getCategoryNames = (question: Question) => {
    return question.categories.map(cat => cat.name).join(', ')
  }
  
  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Perguntas Globais</h1>
        
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/superadmin/categories" className="text-indigo-600 hover:text-indigo-900">
              Gerenciar Categorias
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Pergunta' : 'Adicionar Nova Pergunta'}
              </h2>
              
              <Formik
                initialValues={
                  isEditing && currentQuestion
                    ? {
                        text: currentQuestion.text,
                        type: currentQuestion.type,
                        difficulty: currentQuestion.difficulty,
                        categoryIds: currentQuestion.categories.map(cat => cat.id),
                        options: currentQuestion.options,
                      }
                    : {
                        text: '',
                        type: 'MULTIPLE_CHOICE',
                        difficulty: 'MEDIUM',
                        categoryIds: [],
                        options: [
                          { text: '', isCorrect: false },
                          { text: '', isCorrect: false },
                        ],
                      }
                }
                validationSchema={validationSchema}
                onSubmit={isEditing ? handleUpdateQuestion : handleAddQuestion}
                enableReinitialize
              >
                {({ values, isSubmitting, setFieldValue }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
                        Texto da Pergunta
                      </label>
                      <Field
                        as="textarea"
                        name="text"
                        id="text"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="text" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Pergunta
                      </label>
                      <Field
                        as="select"
                        name="type"
                        id="type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
                        <option value="OPINION_MULTIPLE">Opinativa</option>
                      </Field>
                      <ErrorMessage name="type" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                        Nível de Dificuldade
                      </label>
                      <Field
                        as="select"
                        name="difficulty"
                        id="difficulty"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="EASY">Fácil</option>
                        <option value="MEDIUM">Médio</option>
                        <option value="HARD">Difícil</option>
                      </Field>
                      <ErrorMessage name="difficulty" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categorias
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {categories.length === 0 ? (
                          <p className="text-sm text-gray-500">Nenhuma categoria disponível</p>
                        ) : (
                          categories.map((category) => (
                            <div key={category.id} className="flex items-center mb-1">
                              <Field
                                type="checkbox"
                                name="categoryIds"
                                value={category.id}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label className="ml-2 text-sm text-gray-700">{category.name}</label>
                            </div>
                          ))
                        )}
                      </div>
                      <ErrorMessage name="categoryIds" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opções
                      </label>
                      <FieldArray name="options">
                        {({ remove, push }) => (
                          <div>
                            {values.options.map((option, index) => (
                              <div key={index} className="flex items-center mb-2">
                                <div className="flex-grow mr-2">
                                  <Field
                                    name={`options.${index}.text`}
                                    placeholder="Texto da opção"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                  <ErrorMessage
                                    name={`options.${index}.text`}
                                    component="div"
                                    className="mt-1 text-xs text-red-600"
                                  />
                                </div>
                                <div className="flex items-center mr-2">
                                  <Field
                                    type="checkbox"
                                    name={`options.${index}.isCorrect`}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  />
                                  <label className="ml-1 text-sm text-gray-700">Correta</label>
                                </div>
                                {values.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => push({ text: '', isCorrect: false })}
                              className="mt-2 px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Adicionar Opção
                            </button>
                          </div>
                        )}
                      </FieldArray>
                      <ErrorMessage name="options" component="div" className="mt-1 text-sm text-red-600" />
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
              <h2 className="text-xl font-semibold mb-4">Perguntas Globais Existentes</h2>
              
              {loading ? (
                <p className="text-center py-4">Carregando perguntas...</p>
              ) : error ? (
                <p className="text-center text-red-600 py-4">{error}</p>
              ) : questions.length === 0 ? (
                <p className="text-center py-4">Nenhuma pergunta encontrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pergunta
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dificuldade
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categorias
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {questions.map((question) => (
                        <tr key={question.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{question.text}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{getTypeLabel(question.type)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{getDifficultyLabel(question.difficulty)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{getCategoryNames(question)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditQuestion(question)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => confirmDeleteQuestion(question.id)}
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
            Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteQuestion} color="primary" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  )
}

export default GlobalQuestions
