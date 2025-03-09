import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import Navbar from '../../../components/admin/Navbar'
import QuestionForm from '../../../components/admin/QuestionForm'
import { useNotificationSystem } from '../../../hooks/useNotificationSystem'

interface Test {
  id: string
  title: string
  description: string | null
  timeLimit: number | null
  active: boolean
  stages: Stage[]
  testStages?: TestStage[] // Adicionado para compatibilidade
}

interface Stage {
  id: string
  title: string
  description: string | null
  order: number
  questions: Question[]
  questionStages?: QuestionStage[] // Adicionado para compatibilidade
}

interface Question {
  id: string
  text: string
  difficulty: string
  options: Option[]
  categories: Category[]
}

interface Option {
  id: string
  text: string
  isCorrect: boolean
}

interface Category {
  id: string
  name: string
}

interface TestStage {
  id: string
  testId: string
  stageId: string
  order: number
  stage: Stage
}

interface QuestionStage {
  id: string
  questionId: string
  stageId: string
  order: number
  question: Question
}

const TestDetail: NextPage = () => {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const notify = useNotificationSystem()
  
  const [test, setTest] = useState<Test | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showAddStageModal, setShowAddStageModal] = useState(false)
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [newStageName, setNewStageName] = useState('')
  const [newStageDescription, setNewStageDescription] = useState('')
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!id || typeof id !== 'string') return

      try {
        setLoading(true)
        
        // Buscar dados do teste
        const testResponse = await fetch(`/api/admin/tests/${id}`)
        if (!testResponse.ok) {
          throw new Error('Erro ao carregar os dados do teste')
        }
        const testData = await testResponse.json()
        
        // Adaptar a estrutura de dados para o formato esperado pelo componente
        const adaptedTest = {
          ...testData,
          testStages: testData.stages ? testData.stages.map(stage => ({
            id: stage.id,
            testId: testData.id,
            stageId: stage.id,
            order: stage.order || 0,
            stage: {
              ...stage,
              questionStages: stage.questions ? stage.questions.map(question => ({
                id: `${stage.id}_${question.id}`,
                questionId: question.id,
                stageId: stage.id,
                order: 0,
                question: question
              })) : []
            }
          })) : []
        }
        
        setTest(adaptedTest)
        
        // Buscar todas as etapas disponíveis
        const stagesResponse = await fetch('/api/admin/stages')
        if (!stagesResponse.ok) {
          throw new Error('Erro ao carregar as etapas')
        }
        const stagesData = await stagesResponse.json()
        setStages(stagesData)
        
        // Buscar todas as categorias
        const categoriesResponse = await fetch('/api/admin/categories')
        if (!categoriesResponse.ok) {
          throw new Error('Erro ao carregar as categorias')
        }
        const categoriesData = await categoriesResponse.json()
        setAvailableCategories(categoriesData)
        setCategories(categoriesData)
        
        // Buscar todas as perguntas
        const questionsResponse = await fetch('/api/admin/questions')
        if (!questionsResponse.ok) {
          throw new Error('Erro ao carregar as perguntas')
        }
        const questionsData = await questionsResponse.json()
        setAvailableQuestions(questionsData)
        
      } catch (error) {
        console.error('Erro:', error)
        notify.showError('Não foi possível carregar os dados. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated' && id) {
      fetchData()
    }
  }, [id, status])

  // Função para recarregar os dados do teste
  const reloadTestData = async () => {
    if (!id || typeof id !== 'string') return

    try {
      setLoading(true)
      
      // Buscar dados do teste
      const testResponse = await fetch(`/api/admin/tests/${id}`)
      if (!testResponse.ok) {
        throw new Error('Erro ao carregar os dados do teste')
      }
      const testData = await testResponse.json()
      
      // Adaptar a estrutura de dados para o formato esperado pelo componente
      const adaptedTest = {
        ...testData,
        testStages: testData.stages ? testData.stages.map(stage => ({
          id: stage.id,
          testId: testData.id,
          stageId: stage.id,
          order: stage.order || 0,
          stage: {
            ...stage,
            questionStages: stage.questions ? stage.questions.map(question => ({
              id: `${stage.id}_${question.id}`,
              questionId: question.id,
              stageId: stage.id,
              order: 0,
              question: question
            })) : []
          }
        })) : []
      }
      
      setTest(adaptedTest)
    } catch (error) {
      console.error('Erro ao recarregar dados:', error)
      notify.showError('Não foi possível recarregar os dados do teste. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para atualizar a ordem de uma etapa
  const updateStageOrder = async (stageId: string, newOrder: number) => {
    try {
      const response = await fetch(`/api/admin/tests/${id}/stages/${stageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: newOrder }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar a ordem da etapa')
      }

      // Recarregar os dados do teste
      await reloadTestData()
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Ocorreu um erro ao reordenar as etapas. Por favor, tente novamente.')
    }
  }

  // Função para mover uma etapa para cima
  const moveStageUp = async (testStage: TestStage, index: number) => {
    if (index === 0) return // Já está no topo

    const stages = [...test.testStages].sort((a, b) => a.order - b.order)
    const prevStage = stages[index - 1]
    
    // Trocar as ordens
    const tempOrder = prevStage.order
    await updateStageOrder(prevStage.id, testStage.order)
    await updateStageOrder(testStage.id, tempOrder)
  }

  // Função para mover uma etapa para baixo
  const moveStageDown = async (testStage: TestStage, index: number) => {
    const stages = [...test.testStages].sort((a, b) => a.order - b.order)
    if (index === stages.length - 1) return // Já está no final
    
    const nextStage = stages[index + 1]
    
    // Trocar as ordens
    const tempOrder = nextStage.order
    await updateStageOrder(nextStage.id, testStage.order)
    await updateStageOrder(testStage.id, tempOrder)
  }

  // Função para mover uma etapa para o topo
  const moveStageToTop = async (testStage: TestStage) => {
    const stages = [...test.testStages].sort((a, b) => a.order - b.order)
    if (stages[0].id === testStage.id) return // Já está no topo
    
    // Reordenar todas as etapas
    const updates = stages.map(async (stage, idx) => {
      if (stage.id === testStage.id) {
        return updateStageOrder(stage.id, 0)
      } else if (stage.order < testStage.order) {
        return updateStageOrder(stage.id, stage.order + 1)
      }
      return Promise.resolve()
    })
    
    await Promise.all(updates)
  }

  // Função para mover uma etapa para o final
  const moveStageToBottom = async (testStage: TestStage) => {
    const stages = [...test.testStages].sort((a, b) => a.order - b.order)
    if (stages[stages.length - 1].id === testStage.id) return // Já está no final
    
    const maxOrder = stages.length - 1
    
    // Reordenar todas as etapas
    const updates = stages.map(async (stage, idx) => {
      if (stage.id === testStage.id) {
        return updateStageOrder(stage.id, maxOrder)
      } else if (stage.order > testStage.order) {
        return updateStageOrder(stage.id, stage.order - 1)
      }
      return Promise.resolve()
    })
    
    await Promise.all(updates)
  }

  const addStageToTest = async () => {
    if (!newStageName.trim()) {
      notify.showError('O nome da etapa é obrigatório')
      return
    }

    try {
      // Enviar diretamente os dados da nova etapa para o endpoint
      const response = await fetch(`/api/admin/tests/${id}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newStageName,
          description: newStageDescription || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao adicionar etapa ao teste')
      }

      // Recarregar os dados do teste
      await reloadTestData()

      // Limpar campos e fechar modal
      setNewStageName('')
      setNewStageDescription('')
      setShowAddStageModal(false)
      notify.showSuccess('Etapa adicionada com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Ocorreu um erro ao adicionar a etapa. Por favor, tente novamente.')
    }
  }

  const removeStageFromTest = async (testStageId: string) => {
    // Substituir o confirm pelo sistema de notificações
    notify.confirm(
      'Confirmar exclusão',
      'Tem certeza que deseja remover esta etapa? Todas as perguntas associadas serão desvinculadas do teste.',
      async () => {
        try {
          const response = await fetch(`/api/admin/tests/${id}/stages/${testStageId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Erro ao remover etapa do teste')
          }

          // Recarregar os dados do teste
          await reloadTestData()

          notify.showSuccess('Etapa removida com sucesso!')
        } catch (error) {
          console.error('Erro:', error)
          notify.showError('Ocorreu um erro ao remover a etapa. Por favor, tente novamente.')
        }
      },
      {
        type: 'warning',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
      }
    );
  }

  const openAddQuestionsModal = (stageId: string) => {
    setSelectedStageId(stageId)
    setSelectedQuestions([])
    setShowAddQuestionsModal(true)
  }

  const filteredQuestions = availableQuestions.filter(question => {
    // Filtro por categoria
    if (selectedCategory !== 'all') {
      if (!question.categories.some(cat => cat.id === selectedCategory)) {
        return false
      }
    }
    
    // Filtro por dificuldade
    if (selectedDifficulty !== 'all' && question.difficulty !== selectedDifficulty) {
      return false
    }
    
    return true
  })

  const toggleQuestionSelection = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId))
    } else {
      setSelectedQuestions([...selectedQuestions, questionId])
    }
  }

  const addQuestionsToStage = async () => {
    if (!selectedStageId || selectedQuestions.length === 0) {
      notify.showError('Selecione pelo menos uma pergunta para adicionar à etapa')
      return
    }

    try {
      const response = await fetch(`/api/admin/stages/${selectedStageId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionIds: selectedQuestions,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao adicionar perguntas à etapa')
      }

      // Atualizar o teste com os dados atualizados
      const updatedTestResponse = await fetch(`/api/admin/tests/${id}`)
      const updatedTest = await updatedTestResponse.json()
      setTest(updatedTest)

      // Limpar seleção e fechar modal
      setSelectedQuestions([])
      setShowAddQuestionsModal(false)
      notify.showSuccess('Perguntas adicionadas com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Ocorreu um erro ao adicionar as perguntas. Por favor, tente novamente.')
    }
  }

  const removeQuestionFromStage = async (stageId: string, questionId: string) => {
    // Substituir o confirm pelo sistema de notificações
    notify.confirm(
      'Confirmar exclusão',
      'Tem certeza que deseja remover esta pergunta da etapa?',
      async () => {
        try {
          const response = await fetch(`/api/admin/stages/${stageId}/questions/${questionId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Erro ao remover pergunta da etapa')
          }

          // Atualizar localmente sem fazer nova requisição
          if (test && test.testStages) {
            const updatedTestStages = test.testStages.map(testStage => {
              if (testStage.stageId === stageId) {
                return {
                  ...testStage,
                  stage: {
                    ...testStage.stage,
                    questionStages: testStage.stage.questionStages?.filter(
                      qs => qs.questionId !== questionId
                    ) || []
                  }
                }
              }
              return testStage
            })

            setTest({
              ...test,
              testStages: updatedTestStages
            })

            notify.showSuccess('Pergunta removida com sucesso!')
          }
        } catch (error) {
          console.error('Erro:', error)
          notify.showError('Ocorreu um erro ao remover a pergunta. Por favor, tente novamente.')
        }
      },
      {
        type: 'warning',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
      }
    );
  }

  const handleCreateQuestion = async (values: any, formikHelpers?: any) => {
    try {
      // Adicionar o stageId se estiver selecionado
      if (selectedStageId) {
        values.stageId = selectedStageId;
      }
      
      // Enviar a pergunta para a API
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar pergunta');
      }
      
      // Atualizar a lista de perguntas disponíveis
      const questionsResponse = await fetch('/api/admin/questions');
      const questionsData = await questionsResponse.json();
      setAvailableQuestions(questionsData);
      
      // Fechar o formulário
      setShowNewQuestionForm(false);
      
      // Resetar o formulário se necessário
      if (formikHelpers) {
        formikHelpers.resetForm();
      }
      
      notify.showSuccess('Pergunta criada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao criar pergunta:', error);
      notify.showError(error.message || 'Erro ao criar pergunta');
    }
  };

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

  if (!test) {
    return (
      <div className="min-h-screen bg-secondary-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-xl font-semibold text-red-600">Teste não encontrado</h1>
            <p className="mt-2 text-secondary-600">O teste solicitado não existe ou você não tem permissão para acessá-lo.</p>
            <div className="mt-4">
              <Link href="/admin/tests" className="text-primary-600 hover:text-primary-800">
                Voltar para lista de testes
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/tests" className="text-primary-600 hover:text-primary-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para lista de testes
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-secondary-800">{test.title}</h1>
              {test.description && (
                <p className="mt-2 text-secondary-600">{test.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4">
                <span className={`px-2 py-1 text-xs rounded-full ${test.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {test.active ? 'Ativo' : 'Inativo'}
                </span>
                {test.timeLimit && (
                  <span className="text-sm text-secondary-600">
                    Tempo limite: {test.timeLimit} minutos
                  </span>
                )}
              </div>
            </div>
            <Link 
              href={`/admin/tests`}
              className="px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
            >
              Editar teste
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-secondary-800">Etapas do Teste</h2>
            <button
              onClick={() => setShowAddStageModal(true)}
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Adicionar Etapa
            </button>
          </div>

          {!test || !test.testStages || test.testStages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-secondary-600">Este teste ainda não possui etapas.</p>
              <button
                onClick={() => setShowAddStageModal(true)}
                className="mt-4 px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
              >
                Adicionar uma etapa
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {test.testStages
                .sort((a, b) => a.order - b.order)
                .map((testStage, index) => (
                  <div key={testStage.id} className="flex items-stretch">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden flex-grow">
                      <div className="bg-secondary-50 px-6 py-4 flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-medium text-secondary-800">
                            {index + 1}. {testStage.stage.title}
                          </h3>
                          {testStage.stage.description && (
                            <p className="mt-1 text-sm text-secondary-600">{testStage.stage.description}</p>
                          )}
                        </div>
                        <div>
                          <button
                            onClick={() => openAddQuestionsModal(testStage.stage.id)}
                            className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50 mb-2 block w-full"
                          >
                            Adicionar Perguntas
                          </button>
                          <button
                            onClick={() => removeStageFromTest(testStage.id)}
                            className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-md hover:bg-red-50 block w-full"
                          >
                            Remover Etapa
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h4 className="text-sm font-medium text-secondary-500 mb-3">
                          Perguntas ({testStage.stage.questionStages.length})
                        </h4>
                        
                        {testStage.stage.questionStages.length === 0 ? (
                          <div className="text-center py-4 text-secondary-500">
                            <p>Nenhuma pergunta nesta etapa.</p>
                            <button
                              onClick={() => openAddQuestionsModal(testStage.stage.id)}
                              className="mt-2 text-sm text-primary-600 hover:text-primary-800"
                            >
                              Adicionar perguntas
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {testStage.stage.questionStages
                              .sort((a, b) => a.order - b.order)
                              .map((questionStage, qIndex) => (
                                <div key={questionStage.id} className="border border-secondary-200 rounded-md p-4">
                                  <div className="flex justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-secondary-800">
                                        {qIndex + 1}. {questionStage.question.text}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          questionStage.question.difficulty === 'EASY' 
                                            ? 'bg-green-100 text-green-800' 
                                            : questionStage.question.difficulty === 'MEDIUM'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {questionStage.question.difficulty === 'EASY' 
                                            ? 'Fácil' 
                                            : questionStage.question.difficulty === 'MEDIUM'
                                            ? 'Médio'
                                            : 'Difícil'
                                          }
                                        </span>
                                        {questionStage.question.categories && questionStage.question.categories.length > 0 && 
                                          questionStage.question.categories.map(category => (
                                            <span 
                                              key={category.id}
                                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                            >
                                              {category.name}
                                            </span>
                                          ))
                                        }
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removeQuestionFromStage(questionStage.stageId, questionStage.questionId)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Botões de reordenação */}
                    <div className="ml-4 flex flex-col justify-center">
                      <div className="flex flex-col border border-secondary-300 rounded-md overflow-hidden bg-white shadow-sm">
                        <button
                          onClick={() => moveStageToTop(testStage)}
                          title="Mover para o topo"
                          className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center"
                          disabled={index === 0}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveStageUp(testStage, index)}
                          title="Mover para cima"
                          className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center border-t border-secondary-300"
                          disabled={index === 0}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveStageDown(testStage, index)}
                          title="Mover para baixo"
                          className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center border-t border-secondary-300"
                          disabled={index === test.testStages.length - 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveStageToBottom(testStage)}
                          title="Mover para o final"
                          className="px-2 py-2 text-xs text-secondary-600 hover:bg-secondary-100 flex items-center justify-center border-t border-secondary-300"
                          disabled={index === test.testStages.length - 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para adicionar etapa */}
      {showAddStageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">Adicionar Etapa ao Teste</h2>
            
            <div className="mb-4">
              <label htmlFor="stageName" className="block text-sm font-medium text-secondary-700 mb-1">
                Nome da Etapa *
              </label>
              <input
                type="text"
                id="stageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite o nome da etapa"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="stageDescription" className="block text-sm font-medium text-secondary-700 mb-1">
                Descrição
              </label>
              <textarea
                id="stageDescription"
                value={newStageDescription}
                onChange={(e) => setNewStageDescription(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite a descrição da etapa (opcional)"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddStageModal(false)}
                className="px-4 py-2 text-sm text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
              >
                Cancelar
              </button>
              <button
                onClick={addStageToTest}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para adicionar perguntas à etapa */}
      {showAddQuestionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              Adicionar Perguntas à Etapa
            </h2>
            
            <div className="flex justify-between mb-4">
              <div className="w-64">
                <label htmlFor="categoryFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                  Filtrar por Categoria
                </label>
                <select
                  id="categoryFilter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                >
                  <option value="all">Todas as categorias</option>
                  {availableCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="w-64">
                <label htmlFor="difficultyFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                  Filtrar por Dificuldade
                </label>
                <select
                  id="difficultyFilter"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                >
                  <option value="all">Todas as dificuldades</option>
                  <option value="EASY">Fácil</option>
                  <option value="MEDIUM">Médio</option>
                  <option value="HARD">Difícil</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 mb-4 border border-secondary-200 rounded-md">
              {filteredQuestions.length === 0 ? (
                <div className="p-6 text-center text-secondary-500">
                  Nenhuma pergunta encontrada com os filtros selecionados.
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {filteredQuestions.map(question => (
                    <div 
                      key={question.id}
                      className={`p-4 border rounded-md ${
                        selectedQuestions.includes(question.id) 
                          ? 'bg-primary-50 border-primary-500' 
                          : 'border-secondary-200 hover:border-secondary-400'
                      }`}
                      onClick={() => toggleQuestionSelection(question.id)}
                    >
                      <div>
                        <div className="font-medium text-secondary-800">
                          {question.text}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            question.difficulty === 'EASY' 
                              ? 'bg-green-100 text-green-800' 
                              : question.difficulty === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty === 'EASY' 
                              ? 'Fácil' 
                              : question.difficulty === 'MEDIUM'
                              ? 'Médio'
                              : 'Difícil'
                            }
                          </span>
                          
                          {question.categories && question.categories.map(category => (
                            <span 
                              key={category.id}
                              className="px-2 py-1 text-xs bg-secondary-100 text-secondary-800 rounded-full"
                            >
                              {category.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-end">
                        <div className={`h-6 w-6 rounded-full border ${
                          selectedQuestions.includes(question.id)
                            ? 'bg-primary-500 border-primary-600 text-white'
                            : 'border-secondary-400'
                        } flex items-center justify-center`}>
                          {selectedQuestions.includes(question.id) && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddQuestionsModal(false)}
                className="px-4 py-2 text-sm text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
              >
                Cancelar
              </button>
              <button
                onClick={addQuestionsToStage}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
                disabled={selectedQuestions.length === 0}
              >
                Adicionar {selectedQuestions.length} pergunta(s)
              </button>
              <button
                onClick={() => setShowNewQuestionForm(true)}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Criar Nova Pergunta
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showNewQuestionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">Criar Nova Pergunta</h2>
            
            <QuestionForm
              stages={stages}
              categories={categories}
              preSelectedStageId={selectedStageId || undefined}
              onSubmit={handleCreateQuestion}
              onCancel={() => setShowNewQuestionForm(false)}
              onSuccess={() => {
                notify.showSuccess('Pergunta criada com sucesso!');
              }}
              hideStageField={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TestDetail