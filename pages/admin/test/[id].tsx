import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import Navbar from '../../../components/admin/Navbar'

interface Test {
  id: string
  title: string
  description: string | null
  timeLimit: number | null
  active: boolean
  testSections: TestSection[]
}

interface TestSection {
  id: string
  testId: string
  sectionId: string
  order: number
  section: Section
}

interface Section {
  id: string
  title: string
  description: string | null
  questionSections: QuestionSection[]
}

interface QuestionSection {
  id: string
  questionId: string
  sectionId: string
  order: number
  question: Question
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

const TestDetail: NextPage = () => {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  
  const [test, setTest] = useState<Test | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Modal states
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionDescription, setNewSectionDescription] = useState('')

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
        setTest(testData)
        
        // Buscar todas as seções disponíveis
        const sectionsResponse = await fetch('/api/admin/sections')
        if (!sectionsResponse.ok) {
          throw new Error('Erro ao carregar as seções')
        }
        const sectionsData = await sectionsResponse.json()
        setSections(sectionsData)
        
        // Buscar todas as categorias
        const categoriesResponse = await fetch('/api/admin/categories')
        if (!categoriesResponse.ok) {
          throw new Error('Erro ao carregar as categorias')
        }
        const categoriesData = await categoriesResponse.json()
        setAvailableCategories(categoriesData)
        
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

  const addSectionToTest = async () => {
    if (!newSectionName.trim()) {
      setError('Nome da seção é obrigatório')
      return
    }

    try {
      // Primeiro criar a seção
      const createSectionResponse = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newSectionName.trim(),
          description: newSectionDescription.trim() || null,
        }),
      })

      if (!createSectionResponse.ok) {
        throw new Error('Erro ao criar a seção')
      }

      const newSection = await createSectionResponse.json()

      // Depois adicionar a seção ao teste
      const order = test?.testSections?.length || 0
      const addToTestResponse = await fetch(`/api/admin/tests/${id}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionId: newSection.id,
          order,
        }),
      })

      if (!addToTestResponse.ok) {
        throw new Error('Erro ao adicionar seção ao teste')
      }

      // Atualizar a lista de seções
      const updatedTestResponse = await fetch(`/api/admin/tests/${id}`)
      const updatedTest = await updatedTestResponse.json()
      setTest(updatedTest)

      // Limpar o formulário e fechar o modal
      setNewSectionName('')
      setNewSectionDescription('')
      setShowAddSectionModal(false)
      setSuccessMessage('Seção adicionada com sucesso!')

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao adicionar a seção. Por favor, tente novamente.')
    }
  }

  const removeSectionFromTest = async (testSectionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta seção do teste?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/tests/${id}/sections/${testSectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao remover a seção do teste')
      }

      // Atualizar a interface removendo a seção
      setTest({
        ...test!,
        testSections: test!.testSections.filter(ts => ts.id !== testSectionId)
      })

      setSuccessMessage('Seção removida com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao remover a seção. Por favor, tente novamente.')
    }
  }

  const openAddQuestionsModal = (sectionId: string) => {
    setSelectedSectionId(sectionId)
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

  const addQuestionsToSection = async () => {
    if (!selectedSectionId || selectedQuestions.length === 0) {
      return
    }

    try {
      const response = await fetch(`/api/admin/sections/${selectedSectionId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionIds: selectedQuestions,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao adicionar perguntas à seção')
      }

      // Atualizar o teste com os dados atualizados
      const updatedTestResponse = await fetch(`/api/admin/tests/${id}`)
      const updatedTest = await updatedTestResponse.json()
      setTest(updatedTest)

      // Fechar modal e mostrar mensagem de sucesso
      setShowAddQuestionsModal(false)
      setSuccessMessage('Perguntas adicionadas com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao adicionar as perguntas. Por favor, tente novamente.')
    }
  }

  const removeQuestionFromSection = async (questionSectionId: string, sectionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta pergunta da seção?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/sections/${sectionId}/questions/${questionSectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao remover a pergunta da seção')
      }

      // Atualizar a interface
      const updatedTestSections = test!.testSections.map(ts => {
        if (ts.sectionId === sectionId) {
          return {
            ...ts,
            section: {
              ...ts.section,
              questionSections: ts.section.questionSections.filter(qs => qs.id !== questionSectionId)
            }
          }
        }
        return ts
      })

      setTest({
        ...test!,
        testSections: updatedTestSections
      })

      setSuccessMessage('Pergunta removida com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao remover a pergunta. Por favor, tente novamente.')
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
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-secondary-800">Seções do Teste</h2>
            <button
              onClick={() => setShowAddSectionModal(true)}
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Adicionar Seção
            </button>
          </div>

          {test.testSections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-secondary-600">Este teste ainda não possui seções.</p>
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="mt-4 px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
              >
                Adicionar uma seção
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {test.testSections
                .sort((a, b) => a.order - b.order)
                .map((testSection, index) => (
                  <div key={testSection.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-secondary-50 px-6 py-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-secondary-800">
                          {index + 1}. {testSection.section.title}
                        </h3>
                        {testSection.section.description && (
                          <p className="mt-1 text-sm text-secondary-600">{testSection.section.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openAddQuestionsModal(testSection.section.id)}
                          className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                        >
                          Adicionar Perguntas
                        </button>
                        <button
                          onClick={() => removeSectionFromTest(testSection.id)}
                          className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                        >
                          Remover Seção
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h4 className="text-sm font-medium text-secondary-500 mb-3">
                        Perguntas ({testSection.section.questionSections.length})
                      </h4>
                      
                      {testSection.section.questionSections.length === 0 ? (
                        <div className="text-center py-4 text-secondary-500">
                          <p>Nenhuma pergunta nesta seção.</p>
                          <button
                            onClick={() => openAddQuestionsModal(testSection.section.id)}
                            className="mt-2 text-sm text-primary-600 hover:text-primary-800"
                          >
                            Adicionar perguntas
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {testSection.section.questionSections
                            .sort((a, b) => a.order - b.order)
                            .map((questionSection, qIndex) => (
                              <div key={questionSection.id} className="border border-secondary-200 rounded-md p-4">
                                <div className="flex justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-secondary-800">
                                      {qIndex + 1}. {questionSection.question.text}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        questionSection.question.difficulty === 'EASY' 
                                          ? 'bg-green-100 text-green-800' 
                                          : questionSection.question.difficulty === 'MEDIUM'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {questionSection.question.difficulty === 'EASY' 
                                          ? 'Fácil' 
                                          : questionSection.question.difficulty === 'MEDIUM'
                                          ? 'Médio'
                                          : 'Difícil'}
                                      </span>
                                      
                                      {questionSection.question.categories.map(category => (
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
                                      {questionSection.question.options.map(option => (
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
                                      onClick={() => removeQuestionFromSection(questionSection.id, testSection.section.id)}
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

      {/* Modal para adicionar seção */}
      {showAddSectionModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-secondary-800">Adicionar Seção</h3>
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="sectionName" className="block text-sm font-medium text-secondary-700 mb-1">
                Nome da Seção *
              </label>
              <input
                id="sectionName"
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ex: Conhecimentos Técnicos"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="sectionDescription" className="block text-sm font-medium text-secondary-700 mb-1">
                Descrição
              </label>
              <textarea
                id="sectionDescription"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Descrição opcional da seção"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="px-4 py-2 text-sm text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50"
              >
                Cancelar
              </button>
              <button
                onClick={addSectionToTest}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para adicionar perguntas */}
      {showAddQuestionsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-secondary-800">Adicionar Perguntas à Seção</h3>
              <button
                onClick={() => setShowAddQuestionsModal(false)}
                className="text-secondary-500 hover:text-secondary-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 flex flex-wrap gap-4">
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
                          
                          {question.categories.map(category => (
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
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-secondary-600">
                {selectedQuestions.length} {selectedQuestions.length === 1 ? 'pergunta selecionada' : 'perguntas selecionadas'}
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddQuestionsModal(false)}
                  className="px-4 py-2 text-sm text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={addQuestionsToSection}
                  disabled={selectedQuestions.length === 0}
                  className={`px-4 py-2 text-sm text-white rounded-md ${
                    selectedQuestions.length === 0 
                      ? 'bg-primary-400 cursor-not-allowed' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestDetail