import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'

interface Question {
  id: string
  text: string
  options: {
    id: string
    text: string
  }[]
}

const TestStage: NextPage = () => {
  const router = useRouter()
  const { id: stageId, candidateId } = router.query
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [stageInfo, setStageInfo] = useState({ title: '', description: '' })
  const [error, setError] = useState('')
  const [savedResponses, setSavedResponses] = useState<Record<string, string>>({})
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Função para salvar respostas no localStorage
  const saveResponsesToLocalStorage = (responses: Record<string, string>) => {
    if (typeof window !== 'undefined' && candidateId) {
      localStorage.setItem(
        `candidate_${candidateId}_stage_${stageId}`, 
        JSON.stringify(responses)
      )
    }
  }

  // Função para carregar respostas do localStorage
  const loadResponsesFromLocalStorage = () => {
    if (typeof window !== 'undefined' && candidateId && stageId) {
      const saved = localStorage.getItem(`candidate_${candidateId}_stage_${stageId}`)
      if (saved) {
        try {
          const parsedResponses = JSON.parse(saved)
          setSavedResponses(parsedResponses)
          return parsedResponses
        } catch (e) {
          console.error('Erro ao carregar respostas salvas:', e)
        }
      }
    }
    return {}
  }

  // Monitorar estado da conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      if (isReconnecting) {
        setIsReconnecting(false)
      }
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar estado inicial
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isReconnecting])

  useEffect(() => {
    if (!stageId || !candidateId) return

    const fetchQuestions = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/questions?stageId=${stageId}`)
        
        if (!response.ok) {
          throw new Error('Erro ao carregar as questões')
        }
        
        const data = await response.json()
        setQuestions(data.questions)
        setStageInfo({
          title: data.stageTitle || `Etapa ${stageId}`,
          description: data.stageDescription || 'Responda todas as questões abaixo'
        })

        // Carregar respostas salvas do localStorage
        loadResponsesFromLocalStorage()
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar as questões. Por favor, tente novamente.')
        
        // Tentar carregar respostas salvas mesmo em caso de erro
        loadResponsesFromLocalStorage()
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [stageId, candidateId])

  const handleSubmit = async (values: Record<string, string>) => {
    // Salvar as respostas localmente antes de enviar
    saveResponsesToLocalStorage(values)
    
    // Se estiver offline, mostrar mensagem e não tentar enviar
    if (isOffline) {
      alert('Você está offline. Suas respostas foram salvas localmente e serão enviadas quando sua conexão for restaurada.')
      return
    }

    try {
      // Enviar as respostas para a API
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId,
          stageId,
          responses: Object.entries(values).map(([questionId, optionId]) => ({
            questionId,
            optionId,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar as respostas')
      }

      // Limpar dados salvos localmente após envio bem-sucedido
      if (typeof window !== 'undefined' && candidateId) {
        localStorage.removeItem(`candidate_${candidateId}_stage_${stageId}`)
      }

      // Verificar se é a última etapa
      const currentStage = parseInt(stageId as string)
      if (currentStage >= 6) {
        // Redirecionar para a página de agradecimento
        router.push('/teste/agradecimento')
      } else {
        // Redirecionar para a próxima etapa
        router.push(`/teste/etapa/${currentStage + 1}?candidateId=${candidateId}`)
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao salvar suas respostas. Suas respostas foram salvas localmente e você pode tentar enviar novamente.')
      // Manter os dados salvos localmente para tentar novamente
    }
  }

  // Função para tentar reenviar respostas salvas
  const handleRetry = async () => {
    setIsReconnecting(true)
    const savedValues = loadResponsesFromLocalStorage()
    
    if (Object.keys(savedValues).length > 0) {
      await handleSubmit(savedValues)
    } else {
      router.reload()
    }
  }

  // Gerar esquema de validação dinâmico com base nas questões
  const generateValidationSchema = () => {
    const schema: any = {}
    questions.forEach((question) => {
      schema[question.id] = Yup.string().required('Esta questão é obrigatória')
    })
    return Yup.object(schema)
  }

  // Gerar valores iniciais para o formulário
  const generateInitialValues = () => {
    const initialValues: any = {}
    questions.forEach((question) => {
      initialValues[question.id] = ''
    })
    
    // Mesclar com respostas salvas, se existirem
    return { ...initialValues, ...savedResponses }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-700">Carregando questões...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-secondary-800 mb-2">Erro</h1>
          <p className="text-secondary-600 mb-6">{error}</p>
          
          {Object.keys(savedResponses).length > 0 && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
              <p className="font-medium">Suas respostas anteriores foram recuperadas!</p>
              <p className="text-sm">Você pode continuar de onde parou.</p>
            </div>
          )}
          
          <button
            onClick={handleRetry}
            className="btn-primary"
          >
            {Object.keys(savedResponses).length > 0 ? 'Continuar de Onde Parei' : 'Tentar Novamente'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-12">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            <Image 
              src="/images/logo_horizontal.png"
              alt="AvaliaRH Logo"
              width={180}
              height={54}
              priority
            />
          </Link>
          <div className="flex items-center">
            {isOffline && (
              <div className="mr-4 bg-red-100 text-red-700 px-3 py-1 text-sm rounded-full flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Offline
              </div>
            )}
            <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full font-medium">
              Etapa {stageId} de 6
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto">
          {isOffline && (
            <div className="card mb-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-start">
                <div className="text-yellow-500 text-xl mr-3">⚠️</div>
                <div>
                  <h3 className="font-medium text-yellow-700">Você está offline</h3>
                  <p className="text-yellow-600 text-sm">
                    Suas respostas serão salvas localmente e enviadas automaticamente quando sua conexão for restaurada.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {Object.keys(savedResponses).length > 0 && (
            <div className="card mb-4 bg-green-50 border-green-200">
              <div className="flex items-start">
                <div className="text-green-500 text-xl mr-3">✓</div>
                <div>
                  <h3 className="font-medium text-green-700">Respostas recuperadas</h3>
                  <p className="text-green-600 text-sm">
                    Suas respostas anteriores foram recuperadas. Você pode continuar de onde parou.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="card mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 mb-3">{stageInfo.title}</h1>
            <p className="text-secondary-600 mb-4">{stageInfo.description}</p>
            <div className="w-full bg-secondary-100 rounded-full h-2 mb-2">
              <div 
                className="bg-primary-500 h-2 rounded-full" 
                style={{ width: `${(parseInt(stageId as string) - 1) * 16.67}%` }}
              ></div>
            </div>
            <div className="text-sm text-secondary-500 text-right">
              {Math.round((parseInt(stageId as string) - 1) * 16.67)}% concluído
            </div>
          </div>

          <Formik
            initialValues={generateInitialValues()}
            validationSchema={generateValidationSchema()}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-8">
                {questions.map((question, index) => (
                  <div key={question.id} className="card">
                    <div className="flex items-start mb-4">
                      <span className="bg-primary-100 text-primary-800 w-8 h-8 rounded-full flex items-center justify-center font-medium mr-3 flex-shrink-0">
                        {index + 1}
                      </span>
                      <h2 className="text-lg font-medium text-secondary-800">{question.text}</h2>
                    </div>
                    
                    <div className="space-y-3 pl-11">
                      {question.options.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <Field
                            type="radio"
                            name={question.id}
                            id={`${question.id}-${option.id}`}
                            value={option.id}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                          />
                          <label
                            htmlFor={`${question.id}-${option.id}`}
                            className="ml-3 block text-secondary-700"
                          >
                            {option.text}
                          </label>
                        </div>
                      ))}
                      {errors[question.id] && touched[question.id] && (
                        <div className="text-red-500 text-sm mt-1">{errors[question.id] as string}</div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      // Salvar respostas atuais sem enviar
                      const formValues = Object.fromEntries(
                        questions.map(q => [q.id, (document.querySelector(`input[name="${q.id}"]:checked`) as HTMLInputElement)?.value || ''])
                      );
                      saveResponsesToLocalStorage(formValues);
                      alert('Suas respostas foram salvas temporariamente. Você pode continuar mais tarde.');
                    }}
                    className="btn-secondary"
                  >
                    Salvar Progresso
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <span className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></span>
                        Enviando...
                      </span>
                    ) : (
                      'Enviar Respostas'
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </main>
      </div>
    </div>
  )
}

export default TestStage
