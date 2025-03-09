import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'

interface Stage {
  id: string
  title: string
  order: number
}

interface Question {
  id: string
  text: string
  stageId: string
  options: {
    id: string
    text: string
    isCorrect: boolean
  }[]
}

const validationSchema = Yup.object({
  text: Yup.string().required('Texto da pergunta é obrigatório'),
  stageId: Yup.string().required('Etapa é obrigatória'),
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

const Questions: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string>('all')
  
  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    // Carregar etapas e perguntas
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Carregar etapas
        const stagesResponse = await fetch('/api/admin/stages')
        if (!stagesResponse.ok) {
          throw new Error('Erro ao carregar as etapas')
        }
        const stagesData = await stagesResponse.json()
        setStages(stagesData)
        
        // Carregar perguntas
        const questionsResponse = await fetch('/api/admin/questions')
        if (!questionsResponse.ok) {
          throw new Error('Erro ao carregar as perguntas')
        }
        const questionsData = await questionsResponse.json()
        setQuestions(questionsData)
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar os dados. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])
  
  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      const url = isEditing 
        ? `/api/admin/questions/${currentQuestion?.id}` 
        : '/api/admin/questions'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} a pergunta`)
      }
      
      // Recarregar perguntas
      const questionsResponse = await fetch('/api/admin/questions')
      const questionsData = await questionsResponse.json()
      setQuestions(questionsData)
      
      // Limpar formulário e estado
      resetForm()
      setIsEditing(false)
      setCurrentQuestion(null)
      
    } catch (error) {
      console.error('Erro:', error)
      setError(`Ocorreu um erro ao ${isEditing ? 'atualizar' : 'salvar'} a pergunta. Por favor, tente novamente.`)
    }
  }
  
  const handleEdit = (question: Question) => {
    setCurrentQuestion(question)
    setIsEditing(true)
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir a pergunta')
      }
      
      // Atualizar a lista de perguntas
      setQuestions(questions.filter(q => q.id !== id))
      
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao excluir a pergunta. Por favor, tente novamente.')
    }
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setCurrentQuestion(null)
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
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/admin/dashboard" className="text-xl font-bold text-primary-700">
                <Image 
                  src="/images/logo_horizontal.png"
                  alt="AvaliaRH Logo"
                  width={150}
                  height={45}
                  priority
                />
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link href="/admin/dashboard" className="px-3 py-2 text-secondary-700 hover:text-primary-600 font-medium">
                  Dashboard
                </Link>
                <Link href="/admin/questions" className="px-3 py-2 text-primary-600 border-b-2 border-primary-600 font-medium">
                  Perguntas
                </Link>
                <Link href="/admin/stages" className="px-3 py-2 text-secondary-700 hover:text-primary-600 font-medium">
                  Etapas
                </Link>
              </div>
            </div>
            <div className="text-secondary-700 flex items-center space-x-4">
              <span>{session?.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-secondary-700 hover:text-primary-600"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciar Perguntas</h1>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Pergunta */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              {isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}
            </h2>
            
            <Formik
              initialValues={
                isEditing && currentQuestion
                  ? {
                      text: currentQuestion.text,
                      stageId: currentQuestion.stageId,
                      options: currentQuestion.options,
                    }
                  : {
                      text: '',
                      stageId: stages.length > 0 ? stages[0].id : '',
                      options: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                      ],
                    }
              }
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ values, isSubmitting, setFieldValue }) => (
                <Form className="space-y-6">
                  <div>
                    <label htmlFor="text" className="block text-sm font-medium text-secondary-700 mb-1">
                      Pergunta
                    </label>
                    <Field
                      as="textarea"
                      name="text"
                      id="text"
                      rows={3}
                      className="input-field"
                      placeholder="Digite o texto da pergunta"
                    />
                    <ErrorMessage name="text" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div>
                    <label htmlFor="stageId" className="block text-sm font-medium text-secondary-700 mb-1">
                      Etapa
                    </label>
                    <Field
                      as="select"
                      name="stageId"
                      id="stageId"
                      className="input-field"
                    >
                      {stages.length === 0 ? (
                        <option value="">Nenhuma etapa disponível</option>
                      ) : (
                        stages
                          .sort((a, b) => a.order - b.order)
                          .map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.title} (Etapa {stage.order})
                            </option>
                          ))
                      )}
                    </Field>
                    <ErrorMessage name="stageId" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-3">
                      Opções (marque a correta)
                    </label>
                    
                    <FieldArray name="options">
                      {({ remove, push }) => (
                        <div className="space-y-3">
                          {values.options.map((option, index) => (
                            <div key={index} className="flex items-start space-x-3">
                              <div className="pt-2">
                                <Field
                                  type="radio"
                                  name={`options.${index}.isCorrect`}
                                  id={`option-correct-${index}`}
                                  checked={option.isCorrect}
                                  onChange={() => {
                                    setFieldValue(`options.${index}.isCorrect`, true)
                                    values.options.forEach((_, i) => {
                                      if (i !== index) {
                                        setFieldValue(`options.${i}.isCorrect`, false)
                                      }
                                    })
                                  }}
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                                />
                              </div>
                              <div className="flex-grow">
                                <Field
                                  type="text"
                                  name={`options.${index}.text`}
                                  placeholder={`Opção ${index + 1}`}
                                  className="input-field"
                                />
                                <ErrorMessage
                                  name={`options.${index}.text`}
                                  component="div"
                                  className="text-red-500 text-sm mt-1"
                                />
                              </div>
                              {values.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          
                          {values.options.length < 5 && (
                            <button
                              type="button"
                              onClick={() => push({ text: '', isCorrect: false })}
                              className="mt-2 text-primary-600 hover:text-primary-800 font-medium flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-1 1h-3a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Adicionar Opção
                            </button>
                          )}
                          
                          <ErrorMessage
                            name="options"
                            component="div"
                            className="text-red-500 text-sm mt-1"
                          />
                        </div>
                      )}
                    </FieldArray>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting 
                        ? 'Salvando...' 
                        : isEditing 
                          ? 'Atualizar Pergunta' 
                          : 'Adicionar Pergunta'
                      }
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
          
          {/* Lista de Perguntas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              Perguntas Cadastradas
            </h2>
            
            <div className="mb-4">
              <label htmlFor="stageFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                Filtrar por Etapa
              </label>
              <select
                id="stageFilter"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="input-field"
              >
                <option value="all">Todas as Etapas</option>
                {stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title} (Etapa {stage.order})
                    </option>
                  ))}
              </select>
            </div>
            
            {questions.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                Nenhuma pergunta cadastrada
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-secondary-600">
                  {selectedStageId === 'all' 
                    ? `Exibindo todas as ${questions.length} perguntas`
                    : `Exibindo ${questions.filter(q => q.stageId === selectedStageId).length} perguntas da etapa ${stages.find(s => s.id === selectedStageId)?.title || ''}`
                  }
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {questions
                    .filter(question => selectedStageId === 'all' || question.stageId === selectedStageId)
                    .map((question) => {
                    const stage = stages.find(s => s.id === question.stageId)
                    return (
                      <div key={question.id} className="border border-secondary-200 rounded-md p-4 hover:bg-secondary-50">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                            {stage ? `${stage.title} (Etapa ${stage.order})` : 'Etapa não encontrada'}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(question)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(question.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-secondary-800 font-medium mt-2">{question.text}</p>
                        <div className="mt-3 space-y-1">
                          {question.options.map((option, index) => (
                            <div key={option.id || index} className="flex items-center">
                              <span className={`w-4 h-4 rounded-full mr-2 ${option.isCorrect ? 'bg-green-500' : 'bg-secondary-200'}`}></span>
                              <span className={option.isCorrect ? 'font-medium' : ''}>{option.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Questions
