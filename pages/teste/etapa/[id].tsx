import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { useNotification } from '../../../contexts/NotificationContext'

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
  const [isLastStage, setIsLastStage] = useState(false)
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(null)
  const [totalStages, setTotalStages] = useState<number | null>(null)
  const { showToast } = useNotification()

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

  // Verificar se é a última etapa
  useEffect(() => {
    if (!stageId || !candidateId) return;

    const checkIfLastStage = async () => {
      try {
        console.log(`Verificando se etapa ${stageId} é a última para o candidato ${candidateId}...`);
        
        const response = await fetch(`/api/stages/next?currentStage=${stageId}&candidateId=${candidateId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Dados completos da verificação de última etapa:', data);
          
          // Definir os estados com base na resposta da API
          setIsLastStage(!data.hasNextStage);
          setCurrentStageIndex(data.currentStageIndex);
          setTotalStages(data.totalStages);
          
          console.log(`Estado após verificação: isLastStage=${!data.hasNextStage}, currentStageIndex=${data.currentStageIndex}, totalStages=${data.totalStages}`);
          
          // Verificação adicional para testes com apenas duas etapas
          if (data.totalStages === 2) {
            console.log(`ATENÇÃO: Teste com apenas 2 etapas detectado. Verificando se estamos na primeira etapa...`);
            console.log(`Índice atual: ${data.currentStageIndex}, Total de etapas: ${data.totalStages}`);
            
            // Se estamos na etapa 0 (primeira) de um teste com 2 etapas, garantir que não seja marcada como última
            if (data.currentStageIndex === 0) {
              console.log(`Estamos na primeira etapa de um teste com duas etapas. Forçando isLastStage=false`);
              setIsLastStage(false);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar se é a última etapa:', error);
      }
    };

    checkIfLastStage();
  }, [stageId, candidateId]);

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

  // Validação para verificar se todas as perguntas foram respondidas
  const validateResponses = (values: Record<string, string>) => {
    // Esta função será chamada apenas no momento do envio do formulário,
    // não durante a seleção de alternativas
    return {};
  };

  // Função para verificar se todas as perguntas foram respondidas antes de enviar
  const checkAllQuestionsAnswered = (values: Record<string, string>): boolean => {
    const unansweredQuestions = questions.filter(question => !values[question.id]);
    
    if (unansweredQuestions.length > 0) {
      showToast(
        `Por favor, responda todas as perguntas antes de continuar. Faltam ${unansweredQuestions.length} resposta(s).`,
        'warning',
        5000
      );
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (values: Record<string, string>) => {
    // Validar se todas as perguntas foram respondidas
    if (!checkAllQuestionsAnswered(values)) {
      return; // Impedir o envio se houver perguntas não respondidas
    }
    
    try {
      if (isOffline) {
        // Se estiver offline, apenas salvar localmente
        saveResponsesToLocalStorage(values)
        showToast('Você está offline. Suas respostas foram salvas localmente e serão enviadas quando a conexão for restaurada.', 'info')
        return
      }

      // Enviar respostas para a API
      console.log('Enviando respostas para a API...');
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

      console.log('Respostas enviadas com sucesso!');

      // Limpar respostas salvas localmente após envio bem-sucedido
      if (typeof window !== 'undefined' && candidateId) {
        localStorage.removeItem(`candidate_${candidateId}_stage_${stageId}`)
      }
    } catch (error) {
      console.error('Erro ao processar envio de respostas:', error);
      // Se ocorrer um erro, salvar localmente
      saveResponsesToLocalStorage(values);
      setError('Erro ao enviar respostas. Suas respostas foram salvas localmente. Por favor, tente novamente mais tarde.');
    }
  }

  // Função para avançar para a próxima etapa
  const goToNextStage = async () => {
    console.log(`Buscando próxima etapa após etapa ${stageId} para candidato ${candidateId}...`);
    console.log(`Dados atuais: currentStageIndex=${currentStageIndex}, totalStages=${totalStages}`);
    
    try {
      setLoading(true);
      const nextStageResponse = await fetch(`/api/stages/next?currentStage=${stageId}&candidateId=${candidateId}`);
      
      if (nextStageResponse.ok) {
        const nextStageData = await nextStageResponse.json();
        console.log('Resposta completa da próxima etapa:', nextStageData);
        
        if (nextStageData.hasNextStage && nextStageData.nextStageId) {
          // Verificar se o ID da próxima etapa é um UUID válido
          const nextStageId = nextStageData.nextStageId;
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextStageId);
          
          if (isValidUUID) {
            console.log(`Redirecionando para a próxima etapa com UUID: ${nextStageId}`);
            router.push(`/teste/etapa/${nextStageId}?candidateId=${candidateId}`);
          } else {
            console.error(`ID da próxima etapa não é um UUID válido: ${nextStageId}. Buscando UUID correspondente...`);
            
            // Tentar buscar o UUID correspondente ao ID não-UUID
            const uuidResponse = await fetch(`/api/stages/uuid?stageId=${nextStageId}&candidateId=${candidateId}`);
            
            if (uuidResponse.ok) {
              const uuidData = await uuidResponse.json();
              
              if (uuidData && uuidData.uuid) {
                console.log(`UUID correspondente encontrado: ${uuidData.uuid}`);
                router.push(`/teste/etapa/${uuidData.uuid}?candidateId=${candidateId}`);
              } else {
                console.error('Nenhum UUID correspondente encontrado. Usando fallback...');
                router.push(`/teste/etapa/${nextStageId}?candidateId=${candidateId}`);
              }
            } else {
              console.error('Erro ao buscar UUID correspondente. Usando fallback...');
              router.push(`/teste/etapa/${nextStageId}?candidateId=${candidateId}`);
            }
          }
        } else {
          // Verificação especial para testes com 2 etapas
          if (totalStages === 2 && currentStageIndex === 0) {
            console.error('API não retornou nextStageId para teste com 2 etapas. Buscando todas as etapas...');
            
            // Buscar todas as etapas do teste para encontrar a próxima
            try {
              const allStagesResponse = await fetch(`/api/stages?candidateId=${candidateId}`);
              if (allStagesResponse.ok) {
                const allStagesData = await allStagesResponse.json();
                console.log('Todas as etapas do teste:', allStagesData);
                
                if (allStagesData.stages && allStagesData.stages.length > 1) {
                  // Encontrar a etapa atual e a próxima
                  const currentStageIndex = allStagesData.stages.findIndex(
                    (s: any) => s.id === stageId
                  );
                  
                  if (currentStageIndex !== -1 && currentStageIndex < allStagesData.stages.length - 1) {
                    const nextStage = allStagesData.stages[currentStageIndex + 1];
                    
                    // Verificar se o ID da próxima etapa é um UUID válido
                    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextStage.id);
                    
                    if (isValidUUID) {
                      console.log(`Próxima etapa encontrada com UUID válido: ${nextStage.id}`);
                      router.push(`/teste/etapa/${nextStage.id}?candidateId=${candidateId}`);
                    } else {
                      console.error(`ID da próxima etapa não é um UUID válido: ${nextStage.id}. Buscando UUID correspondente...`);
                      
                      // Tentar buscar o UUID correspondente ao ID não-UUID
                      const uuidResponse = await fetch(`/api/stages/uuid?stageId=${nextStage.id}&candidateId=${candidateId}`);
                      
                      if (uuidResponse.ok) {
                        const uuidData = await uuidResponse.json();
                        
                        if (uuidData && uuidData.uuid) {
                          console.log(`UUID correspondente encontrado: ${uuidData.uuid}`);
                          router.push(`/teste/etapa/${uuidData.uuid}?candidateId=${candidateId}`);
                        } else {
                          console.error('Nenhum UUID correspondente encontrado. Usando fallback...');
                          router.push(`/teste/etapa/${nextStage.id}?candidateId=${candidateId}`);
                        }
                      } else {
                        console.error('Erro ao buscar UUID correspondente. Usando fallback...');
                        router.push(`/teste/etapa/${nextStage.id}?candidateId=${candidateId}`);
                      }
                    }
                    return;
                  }
                }
              }
            } catch (error) {
              console.error('Erro ao buscar todas as etapas:', error);
            }
            
            // Se tudo falhar, mostrar mensagem de erro
            showToast('Não foi possível encontrar a próxima etapa. Por favor, entre em contato com o suporte.', 'error');
          } else {
            console.error('Não há próxima etapa ou dados incompletos:', nextStageData);
            showToast('Não foi possível encontrar a próxima etapa. Por favor, entre em contato com o suporte.', 'error');
          }
        }
      } else {
        console.error('Erro ao buscar próxima etapa:', await nextStageResponse.text());
        showToast('Erro ao avançar para a próxima etapa. Por favor, tente novamente.', 'error');
      }
    } catch (error) {
      console.error('Erro ao navegar para a próxima etapa:', error);
      showToast('Erro ao avançar para a próxima etapa. Por favor, tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para finalizar o teste
  const finalizeTest = async () => {
    console.log(`Finalizando teste para candidato ${candidateId}...`);
    console.log(`Dados atuais: currentStageIndex=${currentStageIndex}, totalStages=${totalStages}, isLastStage=${isLastStage}`);
    
    // Verificação especial para testes com 2 etapas
    if (totalStages === 2 && currentStageIndex === 0) {
      console.log('Tentativa de finalizar teste na primeira etapa de um teste com 2 etapas. Redirecionando para a próxima etapa...');
      await goToNextStage();
      return;
    }
    
    try {
      // Verificar se há respostas pendentes para enviar
      if (Object.keys(savedResponses).length > 0) {
        console.log('Enviando respostas pendentes antes de finalizar o teste...');
        
        const response = await fetch('/api/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidateId,
            stageId,
            responses: savedResponses,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro ao enviar respostas pendentes:', errorText);
          showToast('Erro ao enviar respostas. Por favor, tente novamente.', 'error');
          return;
        }
      }
      
      // Marcar o teste como concluído
      console.log(`Marcando teste como concluído para o candidato ${candidateId}...`);
      
      const completeResponse = await fetch('/api/candidates/complete-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidateId }),
      });
      
      if (!completeResponse.ok) {
        console.error('Erro ao marcar teste como concluído:', await completeResponse.text());
        showToast('Erro ao finalizar o teste. Por favor, tente novamente.', 'error');
        return;
      }
      
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
      
      // Redirecionar para a página de conclusão
      console.log('Redirecionando para a página de conclusão...');
      router.push(`/teste/conclusao?candidateId=${candidateId}`);
    } catch (error) {
      console.error('Erro ao finalizar teste:', error);
      showToast('Erro ao finalizar teste. Por favor, tente novamente.', 'error');
    }
  };

  const handleSaveProgress = (values: Record<string, string>) => {
    saveResponsesToLocalStorage(values)
    showToast('Progresso salvo com sucesso! Você pode continuar mais tarde.', 'success')
  }

  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Verificar se o estilo já existe para evitar duplicação
      if (!document.getElementById('custom-button-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'custom-button-styles';
        styleEl.textContent = `
          .btn-success {
            background-color: #10B981;
            color: white;
            font-weight: bold;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            transition-property: background-color, border-color, color, fill, stroke;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
          }
          .btn-success:hover {
            background-color: #059669;
          }
          .btn-secondary {
            background-color: #6B7280;
            color: white;
            font-weight: bold;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            transition-property: background-color, border-color, color, fill, stroke;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
          }
          .btn-secondary:hover {
            background-color: #4B5563;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
  }, []);

  useEffect(() => {
    if (!stageId || !candidateId) return;

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId as string);
    
    if (!isValidUUID) {
      console.log(`ID da etapa não é um UUID válido: ${stageId}. Buscando UUID correspondente...`);
      
      // Tentar buscar o UUID correspondente ao ID não-UUID
      fetch(`/api/stages/uuid?stageId=${stageId}&candidateId=${candidateId}`)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Erro ao buscar UUID correspondente');
        })
        .then(data => {
          if (data && data.uuid) {
            console.log(`UUID correspondente encontrado: ${data.uuid}. Redirecionando...`);
            router.replace(`/teste/etapa/${data.uuid}?candidateId=${candidateId}`);
          }
        })
        .catch(error => {
          console.error('Erro ao buscar UUID:', error);
        });
    }
  }, [stageId, candidateId, router]);

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
                Etapa {stageId} de {testData && testData.stageCount ? testData.stageCount : totalStages || '?'}
              </div>
            </div>
          </div>

          <Formik
            initialValues={savedResponses}
            onSubmit={handleSubmit}
            validate={validateResponses}
          >
            {({ values, isSubmitting, errors, touched }) => (
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
                            className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-primary-50 transition-colors ${
                              errors[question.id] && touched[question.id] ? 'border-red-300' : ''
                            }`}
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
                        {errors[question.id] && touched[question.id] && (
                          <div className="text-red-500 text-sm mt-1">{errors[question.id]}</div>
                        )}
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
                  <div className="flex flex-col items-end">
                    <div className="text-yellow-600 text-sm mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Não será possível retornar após avançar
                    </div>
                    <div className="flex space-x-3">
                      {/* Mostrar o botão de próxima etapa quando não for a última etapa 
                          Casos específicos:
                          1. Se totalStages === 2 e currentStageIndex === 0, sempre mostrar o botão de próxima etapa
                          2. Para outros casos, verificar se não é a última etapa
                      */}
                      {((totalStages === 2 && currentStageIndex === 0) || 
                         (!isLastStage && currentStageIndex !== null && totalStages !== null && currentStageIndex < totalStages - 1)) && (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            if (checkAllQuestionsAnswered(values)) {
                              handleSubmit(values).then(() => goToNextStage());
                            }
                          }}
                        >
                          {isSubmitting ? 'Enviando...' : 'Próxima Etapa'}
                        </button>
                      )}
                      
                      {/* Mostrar o botão de finalizar teste apenas quando for a última etapa 
                          Para testes com 2 etapas, mostrar apenas na etapa 2 (índice 1)
                      */}
                      {((totalStages === 2 && currentStageIndex === 1) || 
                         (totalStages !== 2 && isLastStage) || 
                         (currentStageIndex !== null && totalStages !== null && currentStageIndex === totalStages - 1)) && (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn-success"
                          onClick={(e) => {
                            e.preventDefault();
                            if (checkAllQuestionsAnswered(values)) {
                              handleSubmit(values).then(() => finalizeTest());
                            }
                          }}
                        >
                          {isSubmitting ? 'Enviando...' : 'Finalizar Teste'}
                        </button>
                      )}
                    </div>
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
