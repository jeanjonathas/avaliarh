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

interface TestData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  stageCount?: number;
}

const TestStage: NextPage = () => {
  const router = useRouter()
  const { id: stageId, candidateId } = router.query
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [stageInfo, setStageInfo] = useState({ title: '', description: '' })
  const [testData, setTestData] = useState<TestData | null>(null)
  const [error, setError] = useState('')
  const [savedResponses, setSavedResponses] = useState<Record<string, string>>({})
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

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

  // Carregar dados do teste da sessão
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTestData = sessionStorage.getItem('testData')
      if (storedTestData) {
        try {
          const parsedData = JSON.parse(storedTestData)
          setTestData(parsedData)
          
          // Se o teste tem um limite de tempo, iniciar o contador
          if (parsedData.timeLimit) {
            // Converter minutos para segundos
            setTimeRemaining(parsedData.timeLimit * 60)
          }
        } catch (error) {
          console.error('Erro ao carregar dados do teste:', error)
        }
      }
    }
  }, [])

  // Contador regressivo para o limite de tempo
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Formatar o tempo restante
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return '';
    
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
        // Passar o ID do candidato para o endpoint de questões
        const response = await fetch(`/api/questions?stageId=${stageId}&candidateId=${candidateId}`)
        
        if (!response.ok) {
          throw new Error('Erro ao carregar as questões')
        }
        
        const data = await response.json()
        console.log('Dados recebidos do endpoint de questões:', data)
        
        // Verificar se o teste carregado corresponde ao teste do candidato
        if (data.testId && testData && data.testId !== testData.id) {
          console.warn(`Teste ID diferente: API retornou ${data.testId}, mas o teste carregado é ${testData.id}`)
        }
        
        setQuestions(data.questions)
        setStageInfo({
          title: data.stageTitle || `Etapa ${stageId}`,
          description: data.stageDescription || 'Responda todas as questões abaixo'
        })

        // Carregar respostas salvas do localStorage
        loadResponsesFromLocalStorage()
        
        setLoading(false)
      } catch (error) {
        setError('Erro ao carregar as questões. Por favor, tente novamente.')
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [stageId, candidateId])

  const handleSubmit = async (values: Record<string, string>) => {
    try {
      if (isOffline) {
        // Se estiver offline, apenas salvar localmente
        saveResponsesToLocalStorage(values)
        alert('Você está offline. Suas respostas foram salvas localmente e serão enviadas quando a conexão for restaurada.')
        return
      }

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
        throw new Error('Erro ao enviar respostas')
      }

      // Limpar respostas salvas localmente após envio bem-sucedido
      if (typeof window !== 'undefined' && candidateId) {
        localStorage.removeItem(`candidate_${candidateId}_stage_${stageId}`)
      }

      // Verificar se há próxima etapa
      // Buscar a próxima etapa do teste associado ao candidato
      try {
        console.log(`Buscando próxima etapa após etapa ${stageId} para candidato ${candidateId}...`);
        
        const nextStageResponse = await fetch(`/api/stages/next?currentStage=${stageId}&candidateId=${candidateId}`);
        
        // Verificar se a resposta foi bem-sucedida
        if (nextStageResponse.ok) {
          const nextStageData = await nextStageResponse.json();
          console.log('Resposta da próxima etapa:', nextStageData);
          
          if (nextStageData.hasNextStage && nextStageData.nextStageId) {
            console.log(`Redirecionando para a próxima etapa: ${nextStageData.nextStageId}`);
            // Redirecionar para a próxima etapa
            router.push(`/teste/etapa/${nextStageData.nextStageId}?candidateId=${candidateId}`)
          } else {
            console.log('Não há próxima etapa, finalizando o teste...');
            
            // Marcar o teste como concluído
            try {
              console.log(`Marcando teste como concluído para o candidato ${candidateId}...`);
              
              const completeResponse = await fetch('/api/candidates/complete-test', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ candidateId }),
              });
              
              if (completeResponse.ok) {
                const completeData = await completeResponse.json();
                console.log('Teste marcado como concluído com sucesso:', completeData);
                
                // Atualizar dados na sessão
                if (typeof window !== 'undefined') {
                  const storedCandidateData = sessionStorage.getItem('candidateData');
                  if (storedCandidateData) {
                    try {
                      const parsedData = JSON.parse(storedCandidateData);
                      parsedData.completed = true;
                      parsedData.status = 'APPROVED';
                      sessionStorage.setItem('candidateData', JSON.stringify(parsedData));
                    } catch (error) {
                      console.error('Erro ao atualizar dados do candidato na sessão:', error);
                    }
                  }
                }
              } else {
                console.error('Erro ao marcar teste como concluído:', await completeResponse.text());
              }
            } catch (completeError) {
              console.error('Erro ao marcar teste como concluído:', completeError);
              // Continuar mesmo com erro, pois o importante é mostrar a tela de conclusão
            }
            
            console.log(`Redirecionando para a página de conclusão...`);
            // Redirecionar para a página de conclusão
            router.push(`/teste/conclusao?candidateId=${candidateId}`)
          }
        } else {
          // Se a resposta não foi bem-sucedida, tratar como se não houvesse próxima etapa
          console.log('Resposta da API de próxima etapa não foi bem-sucedida:', nextStageResponse.status);
          
          // Tentar marcar o teste como concluído antes de redirecionar
          try {
            console.log(`Marcando teste como concluído (fallback) para o candidato ${candidateId}...`);
            
            await fetch('/api/candidates/complete-test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ candidateId }),
            });
          } catch (completeError) {
            console.error('Erro ao marcar teste como concluído (fallback):', completeError);
          }
          
          router.push(`/teste/conclusao?candidateId=${candidateId}`)
        }
      } catch (error) {
        console.error('Erro ao buscar próxima etapa:', error);
        
        // Em caso de erro, tentar marcar o teste como concluído antes de redirecionar
        try {
          console.log(`Marcando teste como concluído (erro) para o candidato ${candidateId}...`);
          
          await fetch('/api/candidates/complete-test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ candidateId }),
          });
        } catch (completeError) {
          console.error('Erro ao marcar teste como concluído (erro):', completeError);
        }
        
        // Em caso de erro, assumir que não há próxima etapa e redirecionar para conclusão
        router.push(`/teste/conclusao?candidateId=${candidateId}`)
      }
    } catch (error) {
      console.error('Erro ao enviar respostas:', error)
      // Se ocorrer um erro, salvar localmente
      saveResponsesToLocalStorage(values)
      setError('Erro ao enviar respostas. Suas respostas foram salvas localmente. Por favor, tente novamente mais tarde.')
    }
  }

  const handleSaveProgress = (values: Record<string, string>) => {
    saveResponsesToLocalStorage(values)
    alert('Progresso salvo com sucesso! Você pode continuar mais tarde.')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-lg text-secondary-700">Carregando questões...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-secondary-900 mb-4">Erro</h1>
          <p className="text-secondary-700 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            <Image 
              src="/images/logo_horizontal.png"
              alt="AvaliaRH Logo"
              width={150}
              height={45}
              priority
            />
          </Link>
          
          {isOffline && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Modo Offline
            </div>
          )}
          
          {testData && testData.timeLimit && (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Tempo restante: {formatTimeRemaining()}</span>
            </div>
          )}
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="card mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">{stageInfo.title}</h1>
                <p className="text-secondary-600">{stageInfo.description}</p>
              </div>
              
              {testData && (
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <h2 className="text-lg font-semibold text-secondary-800">
                    {testData.title}
                  </h2>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-1">
                {testData && testData.stageCount ? (
                  // Se temos o número de etapas do teste, usar esse valor
                  Array.from({ length: testData.stageCount }, (_, i) => i + 1).map((step) => (
                    <div 
                      key={step}
                      className={`w-8 h-2 rounded-full ${
                        parseInt(stageId as string) === step 
                          ? 'bg-primary-600' 
                          : parseInt(stageId as string) > step 
                            ? 'bg-primary-300' 
                            : 'bg-gray-200'
                      }`}
                    ></div>
                  ))
                ) : (
                  // Fallback para 6 etapas se não temos essa informação
                  [1, 2, 3, 4, 5, 6].map((step) => (
                    <div 
                      key={step}
                      className={`w-8 h-2 rounded-full ${
                        parseInt(stageId as string) === step 
                          ? 'bg-primary-600' 
                          : parseInt(stageId as string) > step 
                            ? 'bg-primary-300' 
                            : 'bg-gray-200'
                      }`}
                    ></div>
                  ))
                )}
              </div>
              <div className="text-sm text-secondary-500">
                Etapa {stageId} de {testData && testData.stageCount ? testData.stageCount : '6'}
              </div>
            </div>
          </div>

          <Formik
            initialValues={savedResponses}
            onSubmit={handleSubmit}
          >
            {({ values, isSubmitting }) => (
              <Form>
                <div className="space-y-8">
                  {questions.map((question, index) => (
                    <div key={question.id} className="card">
                      <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                        {index + 1}. {question.text}
                      </h3>
                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <label 
                            key={option.id} 
                            className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-primary-50 transition-colors"
                          >
                            <Field
                              type="radio"
                              name={question.id}
                              value={option.id}
                              className="mt-1 mr-3"
                            />
                            <span className="text-secondary-700">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => handleSaveProgress(values)}
                    className="px-4 py-2 border border-primary-300 text-primary-700 rounded-md hover:bg-primary-50"
                  >
                    Salvar Progresso
                  </button>
                  <div className="flex space-x-4">
                    <Link 
                      href={parseInt(stageId as string) > 1 
                        ? `/teste/etapa/${parseInt(stageId as string) - 1}?candidateId=${candidateId}` 
                        : `/teste/introducao`
                      }
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Voltar
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting ? 'Enviando...' : 'Próxima Etapa'}
                    </button>
                  </div>
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
