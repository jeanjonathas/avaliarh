import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import Navbar from '../../../components/admin/Navbar'
import QuestionForm from '../../../components/admin/QuestionForm'

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
  
  const [test, setTest] = useState<Test | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  
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
        setError('')
        
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
        setError('Não foi possível carregar os dados. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated' && id) {
      fetchData()
    }
  }, [id, status])

  const addStageToTest = async () => {
    if (!newStageName.trim()) {
      setError('O nome da etapa é obrigatório')
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

      // Atualizar o teste com os dados atualizados
      const updatedTestResponse = await fetch(`/api/admin/tests/${id}`)
      const updatedTest = await updatedTestResponse.json()
      setTest(updatedTest)

      // Limpar campos e fechar modal
      setNewStageName('')
      setNewStageDescription('')
      setShowAddStageModal(false)
      setSuccessMessage('Etapa adicionada com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao adicionar a etapa. Por favor, tente novamente.')
    }
  }

  const removeStageFromTest = async (testStageId: string) => {
    if (!confirm('Tem certeza que deseja remover esta etapa? Todas as perguntas associadas serão desvinculadas do teste.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/tests/${id}/stages/${testStageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao remover etapa do teste')
      }

      // Atualizar o teste com os dados atualizados
      const updatedTestResponse = await fetch(`/api/admin/tests/${id}`)
      const updatedTest = await updatedTestResponse.json()
      setTest(updatedTest)

      setSuccessMessage('Etapa removida com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao remover a etapa. Por favor, tente novamente.')
    }
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
      setError('Selecione pelo menos uma pergunta para adicionar à etapa')
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

      // Atualizar a interface
      const updatedTestResponse = await fetch(`/api/admin/tests/${id}`)
      const updatedTest = await updatedTestResponse.json()
      setTest(updatedTest)

      // Limpar seleção e fechar modal
      setSelectedQuestions([])
      setShowAddQuestionsModal(false)
      setSuccessMessage('Perguntas adicionadas com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao adicionar as perguntas. Por favor, tente novamente.')
    }
  }

  const removeQuestionFromStage = async (questionStageId: string, stageId: string) => {
    if (!confirm('Tem certeza que deseja remover esta pergunta da etapa?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/stages/${stageId}/questions/${questionStageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao remover a pergunta da etapa')
      }

      // Atualizar a interface
      const updatedTestStages = test!.testStages.map(ts => {
        if (ts.stageId === stageId) {
          return {
            ...ts,
            stage: {
              ...ts.stage,
              questionStages: ts.stage.questionStages.filter(qs => qs.id !== questionStageId)
            }
          }
        }
        return ts
      })

      setTest({
        ...test!,
        testStages: updatedTestStages
      })

      setSuccessMessage('Pergunta removida com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao remover a pergunta. Por favor, tente novamente.')
    }
  }

  const handleCreateQuestion = async (values: any, formikHelpers?: any) => {
    try {
      // Adicionar o stageId se não estiver presente (quando o campo está oculto)
      if (!values.stageId && selectedStageId) {
        values.stageId = selectedStageId;
      }

      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar pergunta');
      }

      const newQuestion = await response.json();
      
      // Atualizar a lista de perguntas
      const questionsResponse = await fetch('/api/admin/questions');
      const questionsData = await questionsResponse.json();
      setAvailableQuestions(questionsData);
      setShowNewQuestionForm(false);
      
      // Resetar o formulário se formikHelpers estiver disponível
      if (formikHelpers && formikHelpers.resetForm) {
        formikHelpers.resetForm();
      }
      
      setSuccessMessage('Pergunta criada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Erro ao criar pergunta:', error);
      setErrorMessage(error.message || 'Erro ao criar pergunta');
      setTimeout(() => setErrorMessage(''), 3000);
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

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}
        
        {errorMessage && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}

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
                  <div key={testStage.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-secondary-50 px-6 py-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-secondary-800">
                          {index + 1}. {testStage.stage.title}
                        </h3>
                        {testStage.stage.description && (
                          <p className="mt-1 text-sm text-secondary-600">{testStage.stage.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openAddQuestionsModal(testStage.stage.id)}
                          className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                        >
                          Adicionar Perguntas
                        </button>
                        <button
                          onClick={() => removeStageFromTest(testStage.id)}
                          className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-md hover:bg-red-50"
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
                                          : 'Difícil'}
                                      </span>
                                      
                                      {questionStage.question.categories && questionStage.question.categories.map(category => (
                                        <span 
                                          key={category.id}
                                          className="px-2 py-1 text-xs bg-secondary-100 text-secondary-800 rounded-full"
                                        >
                                          {category.name}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    {/* Opções */}
                                    <div className="mt-3 space-y-2">
                                      {questionStage.question.options.map(option => (
                                        <div 
                                          key={option.id}
                                          className={`text-sm pl-3 py-1 border-l-2 ${
                                            option.isCorrect
                                              ? 'border-green-500 text-green-800'
                                              : 'border-secondary-300 text-secondary-600'
                                          }`}
                                        >
                                          {option.text}
                                          {option.isCorrect && (
                                            <span className="ml-2 text-xs text-green-600">(Correta)</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <button
                                      onClick={() => removeQuestionFromStage(questionStage.id, testStage.stage.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                              : 'Difícil'}
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
                setSuccessMessage('Pergunta criada com sucesso!');
                setTimeout(() => setSuccessMessage(''), 3000);
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