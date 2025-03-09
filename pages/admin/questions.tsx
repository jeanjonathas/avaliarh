import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Navbar from '../../components/admin/Navbar'
import QuestionForm from '../../components/admin/QuestionForm'
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
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string>('all')
  const [tests, setTests] = useState<any[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string>('all')
  const [filteredStages, setFilteredStages] = useState<Stage[]>([])

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

        // Carregar testes
        const testsResponse = await fetch('/api/admin/tests')
        if (!testsResponse.ok) {
          throw new Error('Erro ao carregar os testes')
        }
        const testsData = await testsResponse.json()
        setTests(testsData)

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

    fetchData()
  }, [])

  useEffect(() => {
    // Efeito para filtrar as etapas com base no teste selecionado
    if (selectedTestId === 'all') {
      // Se "Todos os testes" estiver selecionado, mostrar todas as etapas
      setFilteredStages(stages);
      // Resetar o filtro de etapa para "Todas as etapas"
      setSelectedStageId('all');

      // Carregar todas as perguntas
      const fetchAllQuestions = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/admin/questions');
          if (!response.ok) {
            throw new Error('Erro ao carregar as perguntas');
          }
          const questionsData = await response.json();
          setQuestions(questionsData);
        } catch (error) {
          console.error('Erro:', error);
          setError('Não foi possível carregar as perguntas. Por favor, tente novamente.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchAllQuestions();
    } else {
      // Buscar as etapas do teste selecionado
      const fetchTestStages = async () => {
        try {
          setLoading(true);
          
          // Buscar as etapas do teste
          const response = await fetch(`/api/admin/tests/${selectedTestId}/stages`);
          if (!response.ok) {
            throw new Error('Erro ao carregar as etapas do teste');
          }
          const testStagesData = await response.json();
          
          if (testStagesData.length === 0) {
            // Se o teste não tiver etapas, definir a lista como vazia
            setFilteredStages([]);

            // Também buscar perguntas do teste selecionado sem filtrar por etapa
            const questionsResponse = await fetch(`/api/admin/questions?testId=${selectedTestId}`);
            if (!questionsResponse.ok) {
              throw new Error('Erro ao carregar as perguntas do teste');
            }
            const questionsData = await questionsResponse.json();
            setQuestions(questionsData);
          } else {
            // Criar objetos de etapa diretamente a partir dos dados retornados
            const mappedStages = testStagesData.map((ts: any) => ({
              id: ts.stageId,
              title: ts.stage_title || 'Etapa sem título',
              order: ts.order || 0,
              description: ts.stage_description || ''
            }));
            
            // Filtrar etapas inválidas
            const validStages = mappedStages.filter((stage: any) => stage.id);
            setFilteredStages(validStages);
            
            // Buscar perguntas para todas as etapas do teste
            const questionsResponse = await fetch(`/api/admin/questions?testId=${selectedTestId}`);
            if (!questionsResponse.ok) {
              throw new Error('Erro ao carregar as perguntas do teste');
            }
            const questionsData = await questionsResponse.json();
            setQuestions(questionsData);
          }
          
          // Resetar o filtro de etapa para "Todas as etapas"
          setSelectedStageId('all');
        } catch (error) {
          console.error('Erro:', error);
          setError('Não foi possível carregar as etapas do teste. Por favor, tente novamente.');
          setFilteredStages([]);
          setQuestions([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchTestStages();
    }
  }, [selectedTestId, stages]);

  useEffect(() => {
    // Efeito para carregar perguntas quando a etapa selecionada mudar
    if (selectedStageId === 'all' || !selectedTestId || selectedTestId === 'all') {
      return
    }

    const fetchQuestionsForStage = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/questions?stageId=${selectedStageId}`)
        if (!response.ok) {
          throw new Error('Erro ao carregar as perguntas da etapa')
        }
        const questionsData = await response.json()
        setQuestions(questionsData)
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar as perguntas da etapa. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestionsForStage()
  }, [selectedStageId, selectedTestId])

  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      setError('')

      const method = isEditing ? 'PUT' : 'POST'
      const url = isEditing ? `/api/admin/questions/${currentQuestion?.id}` : '/api/admin/questions'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar a pergunta')
      }

      // Atualizar a lista de perguntas
      const questionsResponse = await fetch('/api/admin/questions')
      const questionsData = await questionsResponse.json()
      setQuestions(questionsData)

      // Limpar o formulário e o estado de edição
      resetForm()
      setIsEditing(false)
      setCurrentQuestion(null)

      // Exibir mensagem de sucesso
      setSuccessMessage(isEditing ? 'Pergunta atualizada com sucesso!' : 'Pergunta criada com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao salvar a pergunta. Por favor, tente novamente.')
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
      setQuestions(questions.filter((q) => q.id !== id))
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
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciar Perguntas</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Pergunta */}
          <QuestionForm
            stages={filteredStages}
            onSubmit={handleSubmit}
            onCancel={isEditing ? handleCancel : undefined}
            initialValues={
              isEditing && currentQuestion
                ? {
                    text: currentQuestion.text,
                    stageId: currentQuestion.stageId,
                    options: currentQuestion.options,
                  }
                : undefined
            }
            isEditing={isEditing}
            hideStageField={true}
          />

          {/* Lista de Perguntas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              Perguntas Cadastradas
            </h2>

            <div className="mb-4">
              <label htmlFor="testFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                Filtrar por Teste
              </label>
              <select
                id="testFilter"
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="input-field"
              >
                <option value="all">Todos os Testes</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedTestId !== 'all' && (
              <div className="mb-4">
                {filteredStages.length > 0 && (
                  <>
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
                      {filteredStages
                        .sort((a, b) => a.order - b.order)
                        .map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.title} (Etapa {stage.order})
                          </option>
                        ))}
                    </select>
                  </>
                )}
              </div>
            )}

            {questions.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                Nenhuma pergunta cadastrada
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-secondary-600">
                  {selectedTestId === 'all' && selectedStageId === 'all'
                    ? `Exibindo todas as ${questions.length} perguntas`
                    : selectedTestId !== 'all' && selectedStageId === 'all' && filteredStages.length > 0
                    ? `Exibindo perguntas do teste "${tests.find((t) => t.id === selectedTestId)?.title || ''}"`
                    : selectedTestId !== 'all' && selectedStageId === 'all' && filteredStages.length === 0
                    ? `O teste "${tests.find((t) => t.id === selectedTestId)?.title || ''}" não possui etapas cadastradas. Por favor, cadastre etapas para este teste antes de criar perguntas.`
                    : `Exibindo perguntas da etapa "${filteredStages.find((s) => s.id === selectedStageId)?.title || ''}"`}
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {questions
                    .filter((question) => {
                      // Se nenhum filtro estiver ativo, mostrar todas as perguntas
                      if (selectedTestId === 'all' && selectedStageId === 'all') {
                        return true
                      }

                      // Se apenas o filtro de teste estiver ativo
                      if (selectedTestId !== 'all' && selectedStageId === 'all') {
                        // Verificar se a etapa da pergunta pertence ao teste selecionado
                        const stageIds = filteredStages.map((stage) => stage.id)
                        // Se não houver etapas no teste, não mostrar nenhuma pergunta
                        if (stageIds.length === 0) {
                          return false
                        }
                        return stageIds.includes(question.stageId)
                      }

                      // Se o filtro de etapa estiver ativo
                      return question.stageId === selectedStageId
                    })
                    .map((question) => {
                      const stage = filteredStages.find((s) => s.id === question.stageId)
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
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(question.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-secondary-800 font-medium mt-2">{question.text}</p>
                          <div className="mt-3 space-y-1">
                            {question.options.map((option, index) => (
                              <div key={option.id || index} className="flex items-center">
                                <span
                                  className={`w-4 h-4 rounded-full mr-2 ${
                                    option.isCorrect ? 'bg-green-500' : 'bg-secondary-200'
                                  }`}
                                ></span>
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
