import { NextPage } from 'next'
import React, { useState, useEffect, useRef } from 'react'
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
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isLastStage, setIsLastStage] = useState(false)
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(null)
  const [totalStages, setTotalStages] = useState<number | null>(null)
  const [stageCompleted, setStageCompleted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Função para salvar o tempo no localStorage
  const saveTimeToLocalStorage = (remainingTime: number | null, spentTime: number) => {
    if (typeof window !== 'undefined' && candidateId) {
      const timeData = {
        remainingTime,
        spentTime,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(
        `candidate_${candidateId}_time`, 
        JSON.stringify(timeData)
      );
      
      console.log(`Tempo salvo no localStorage: ${remainingTime}s restantes, ${spentTime}s gastos, timestamp: ${new Date().toISOString()}`);
    }
  };

  // Função para carregar o tempo do localStorage
  const loadTimeFromLocalStorage = () => {
    if (typeof window !== 'undefined' && candidateId) {
      const saved = localStorage.getItem(`candidate_${candidateId}_time`);
      if (saved) {
        try {
          const parsedTime = JSON.parse(saved);
          console.log(`Tempo carregado do localStorage: ${parsedTime.remainingTime}s restantes, ${parsedTime.spentTime}s gastos`);
          return parsedTime;
        } catch (e) {
          console.error('Erro ao carregar tempo salvo:', e);
        }
      }
    }
    return null;
  };

  // Carregar dados do teste da sessão
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTestData = sessionStorage.getItem('testData')
      if (storedTestData) {
        try {
          const parsedData = JSON.parse(storedTestData)
          setTestData(parsedData)
          
          // Carregar o tempo salvo do localStorage
          const savedTime = loadTimeFromLocalStorage();
          
          if (savedTime && savedTime.remainingTime !== null) {
            // Se temos um tempo salvo, usá-lo
            console.log(`Usando tempo salvo: ${savedTime.remainingTime}s restantes`);
            setTimeRemaining(savedTime.remainingTime);
            setTimeSpent(savedTime.spentTime || 0);
          } else if (parsedData.timeLimit) {
            // Se não temos tempo salvo, mas o teste tem um limite, iniciar o contador
            console.log(`Inicializando tempo do zero: ${parsedData.timeLimit * 60}s`);
            setTimeRemaining(parsedData.timeLimit * 60);
          }
        } catch (error) {
          console.error('Erro ao carregar dados do teste:', error)
        }
      }
    }
  }, [candidateId]) // Adicionar candidateId como dependência para recarregar quando mudar

  // Efeito para inicializar o contador de tempo
  useEffect(() => {
    // Inicializar o tempo de início
    const initialStartTime = Date.now();
    setStartTime(initialStartTime);
    
    // Carregar o tempo salvo do localStorage
    if (typeof window !== 'undefined' && candidateId) {
      const savedTime = loadTimeFromLocalStorage();
      if (savedTime) {
        console.log(`Tempo carregado do localStorage: ${savedTime.remainingTime}s restantes, ${savedTime.spentTime}s gastos`);
        if (savedTime.remainingTime !== null) {
          setTimeRemaining(savedTime.remainingTime);
        }
        if (savedTime.spentTime) {
          setTimeSpent(savedTime.spentTime);
        }
      }
    }
  }, [candidateId, stageId]); // Recarregar quando o candidato ou a etapa mudar

  // Contador de tempo para testes com limite de tempo (regressivo)
  useEffect(() => {
    // Só executar se tiver limite de tempo
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    console.log("Iniciando contador regressivo...");
    
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
      
      // Também incrementar o tempo gasto
      setTimeSpent(prev => {
        const newTimeSpent = prev + 1;
        // Salvar o tempo a cada 5 segundos
        if (newTimeSpent % 5 === 0) {
          saveTimeToLocalStorage(timeRemaining, newTimeSpent);
        }
        return newTimeSpent;
      });
    }, 1000);
    
    return () => {
      console.log("Limpando timer regressivo");
      clearInterval(timerInterval);
    };
  }, [timeRemaining]);

  // Contador de tempo para testes sem limite de tempo (progressivo)
  useEffect(() => {
    // Só executar se não tiver limite de tempo
    if (timeRemaining !== null) return;
    
    console.log("Iniciando contador progressivo simples...");
    
    // Contador simples que incrementa 1 segundo por segundo
    const timerInterval = setInterval(() => {
      setTimeSpent(prev => {
        const newTimeSpent = prev + 1;
        // Salvar o tempo a cada 5 segundos
        if (newTimeSpent % 5 === 0) {
          saveTimeToLocalStorage(null, newTimeSpent);
        }
        return newTimeSpent;
      });
    }, 1000);
    
    return () => {
      console.log("Limpando timer progressivo");
      clearInterval(timerInterval);
    };
  }, [timeRemaining]);

  // Referências para valores atuais
  const timeRemainingRef = useRef(timeRemaining);
  const timeSpentRef = useRef(timeSpent);
  const startTimeRef = useRef(startTime);

  // Atualizar as referências quando os valores mudarem
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);
  
  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);
  
  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

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

  // Função para validar as respostas
  const validateResponses = (values: Record<string, string>) => {
    const errors: Record<string, string> = {};
    
    questions.forEach((question) => {
      if (!values[question.id]) {
        errors[question.id] = 'Esta questão é obrigatória';
      }
    });
    
    return errors;
  };
  
  // Função para verificar se todas as questões foram respondidas
  const checkAllQuestionsAnswered = (values: Record<string, string>) => {
    for (const question of questions) {
      if (!values[question.id]) {
        showToast('Por favor, responda todas as questões antes de prosseguir.', 'error');
        return false;
      }
    }
    return true;
  };

  // Função para enviar as respostas
  const handleSubmit = async (values: Record<string, string>) => {
    try {
      console.log('Enviando respostas:', values);
      console.log('Última pergunta:', questions[questions.length - 1]?.id);
      console.log('Resposta da última pergunta:', values[questions[questions.length - 1]?.id]);
      
      // Verificar se todas as perguntas têm respostas
      const missingResponses = questions.filter(q => !values[q.id]);
      if (missingResponses.length > 0) {
        console.warn(`Atenção: ${missingResponses.length} perguntas sem resposta:`, 
          missingResponses.map(q => q.id));
        showToast('Por favor, responda todas as questões antes de prosseguir.', 'error');
        return false;
      }
      
      // Calcular o tempo gasto em segundos
      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
      console.log(`Tempo gasto nesta etapa: ${timeSpentSeconds} segundos`);
      
      // Converter o objeto de valores para o formato de array esperado pela API
      // Garantir que todas as perguntas estejam incluídas na ordem correta
      const formattedResponses = questions.map(question => {
        const optionId = values[question.id];
        console.log(`Resposta para questão ${question.id}: optionId=${optionId}`);
        
        return {
          questionId: question.id,
          optionId: optionId,
          timeSpent: timeSpentSeconds
        };
      });
      
      console.log('Respostas formatadas:', formattedResponses);
      
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId,
          stageId,
          responses: formattedResponses,
          timeSpent: timeSpentSeconds // Adicionar o tempo total gasto na etapa
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao enviar respostas:', errorText);
        showToast('Erro ao enviar respostas. Por favor, tente novamente.', 'error');
        return false;
      }
      
      // Limpar respostas do localStorage após envio bem-sucedido
      if (typeof window !== 'undefined' && candidateId) {
        localStorage.removeItem(`candidate_${candidateId}_stage_${stageId}`);
      }
      
      console.log('Respostas enviadas com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao enviar respostas:', error);
      showToast('Erro ao enviar respostas. Por favor, tente novamente.', 'error');
      return false;
    }
  }

  // Função para avançar para a próxima etapa
  const goToNextStage = async (values?: Record<string, string>) => {
    setIsSubmitting(true);
    
    // Salvar o tempo atual antes de avançar
    saveTimeToLocalStorage(timeRemaining, timeSpent);
    console.log(`Salvando tempo antes de avançar: ${timeRemaining}s restantes, ${timeSpent}s gastos`);
    
    try {
      console.log(`Buscando próxima etapa para stageId=${stageId} e candidateId=${candidateId}...`);
      
      // Se temos valores e não estamos em uma etapa já concluída, salvar as respostas
      if (values && !stageCompleted) {
        const submitSuccess = await handleSubmit(values);
        if (!submitSuccess) {
          setIsSubmitting(false);
          return;
        }
      }
      
      // Verificar se o ID da etapa atual é um UUID válido
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId as string);
      
      let currentStageId = stageId as string;
      
      // Se não for um UUID válido, buscar o UUID correspondente
      if (!isValidUUID) {
        console.log(`ID da etapa atual não é um UUID válido: ${stageId}. Buscando UUID correspondente...`);
        
        const uuidResponse = await fetch(`/api/stages/uuid?stageId=${stageId}&candidateId=${candidateId}`);
        
        if (uuidResponse.ok) {
          const uuidData = await uuidResponse.json();
          
          if (uuidData && uuidData.uuid) {
            console.log(`UUID correspondente encontrado: ${uuidData.uuid}`);
            currentStageId = uuidData.uuid;
          } else {
            console.error('UUID correspondente não encontrado');
            throw new Error('UUID correspondente não encontrado');
          }
        } else {
          console.error('Erro ao buscar UUID correspondente');
          throw new Error('Erro ao buscar UUID correspondente');
        }
      }
      
      // Marcar a etapa atual como concluída
      await fetch('/api/responses/mark-stage-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: currentStageId,
          candidateId
        }),
      });
      
      // Buscar a próxima etapa
      const response = await fetch(`/api/stages/next?currentStage=${currentStageId}&candidateId=${candidateId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar próxima etapa');
      }
      
      const nextStageData = await response.json();
      console.log('Dados da próxima etapa:', nextStageData);
      
      if (nextStageData.hasNextStage && nextStageData.nextStageId) {
        // Verificar se o ID da próxima etapa é um UUID válido
        const isNextStageIdValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextStageData.nextStageId);
        
        if (isNextStageIdValidUUID) {
          console.log(`Avançando para a próxima etapa: ${nextStageData.nextStageId}`);
          router.push(`/teste/etapa/${nextStageData.nextStageId}?candidateId=${candidateId}`);
        } else {
          console.log(`ID da próxima etapa não é um UUID válido: ${nextStageData.nextStageId}. Buscando UUID correspondente...`);
          
          // Buscar o UUID correspondente ao ID não-UUID
          const uuidResponse = await fetch(`/api/stages/uuid?stageId=${nextStageData.nextStageId}&candidateId=${candidateId}`);
          
          if (uuidResponse.ok) {
            const uuidData = await uuidResponse.json();
            
            if (uuidData && uuidData.uuid) {
              console.log(`UUID correspondente encontrado: ${uuidData.uuid}. Redirecionando...`);
              router.push(`/teste/etapa/${uuidData.uuid}?candidateId=${candidateId}`);
            } else {
              console.error('UUID correspondente não encontrado');
              throw new Error('UUID correspondente não encontrado');
            }
          } else {
            console.error('Erro ao buscar UUID correspondente');
            throw new Error('Erro ao buscar UUID correspondente');
          }
        }
      } else {
        console.log('Não há próxima etapa. Redirecionando para a página de conclusão...');
        router.push(`/teste/conclusao?candidateId=${candidateId}`);
      }
    } catch (error) {
      console.error('Erro ao avançar para a próxima etapa:', error);
      setError('Ocorreu um erro ao tentar avançar para a próxima etapa. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

    // Verificar se a etapa já foi respondida
    const checkIfStageCompleted = async () => {
      try {
        const response = await fetch(`/api/responses/check-stage-completed?stageId=${stageId}&candidateId=${candidateId}`);
        if (response.ok) {
          const data = await response.json();
          setStageCompleted(data.completed);
          
          if (data.completed) {
            console.log(`Etapa ${stageId} já foi respondida pelo candidato ${candidateId}`);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar se a etapa foi respondida:', error);
      }
    };

    checkIfStageCompleted();
  }, [stageId, candidateId, router]);

  // Função para salvar o progresso
  const handleSaveProgress = async (values: Record<string, string>) => {
    // Salvar no localStorage como antes
    saveResponsesToLocalStorage(values);
    
    try {
      // Verificar se todas as perguntas têm respostas (não é obrigatório para salvar progresso)
      const answeredQuestions = questions.filter(q => values[q.id]);
      
      if (answeredQuestions.length === 0) {
        showToast('Nenhuma resposta para salvar.', 'info');
        return;
      }
      
      // Calcular o tempo gasto em segundos
      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
      console.log(`Tempo gasto até o momento: ${timeSpentSeconds} segundos`);
      
      // Converter o objeto de valores para o formato de array esperado pela API
      // Incluir apenas as perguntas que foram respondidas
      const formattedResponses = answeredQuestions.map(question => {
        const optionId = values[question.id];
        console.log(`Salvando resposta para questão ${question.id}: optionId=${optionId}`);
        
        return {
          questionId: question.id,
          optionId: optionId,
          timeSpent: timeSpentSeconds
        };
      });
      
      console.log('Salvando respostas no servidor:', formattedResponses);
      
      // Enviar para a API com flag indicando que é apenas um salvamento de progresso
      const response = await fetch('/api/responses/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId,
          stageId,
          responses: formattedResponses,
          timeSpent: timeSpentSeconds,
          isProgressSave: true // Indicar que é apenas um salvamento de progresso
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao salvar progresso no servidor:', errorText);
        showToast('Progresso salvo localmente, mas houve um erro ao salvar no servidor.', 'warning');
        return;
      }
      
      console.log('Progresso salvo com sucesso no servidor!');
      showToast('Progresso salvo com sucesso! Você pode continuar mais tarde.', 'success');
    } catch (error) {
      console.error('Erro ao salvar progresso no servidor:', error);
      showToast('Progresso salvo localmente, mas houve um erro ao salvar no servidor.', 'warning');
    }
  };

  // Função para finalizar o teste
  const finalizeTest = async () => {
    setIsSubmitting(true);
    
    try {
      console.log(`Finalizando teste para candidato ${candidateId}...`);
      
      // Marcar a etapa atual como concluída
      await fetch('/api/responses/mark-stage-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: stageId as string,
          candidateId
        }),
      });
      
      // Marcar o teste como concluído
      const completeResponse = await fetch('/api/candidates/complete-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidateId }),
      });
      
      if (!completeResponse.ok) {
        throw new Error('Erro ao marcar teste como concluído');
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
      router.push(`/teste/conclusao?candidateId=${candidateId}`);
    } catch (error) {
      console.error('Erro ao finalizar teste:', error);
      setError('Ocorreu um erro ao finalizar o teste. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatar o tempo restante
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return '';
    
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Formatar o tempo gasto
  const formatTimeSpent = () => {
    const hours = Math.floor(timeSpent / 3600);
    const minutes = Math.floor((timeSpent % 3600) / 60);
    const seconds = timeSpent % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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

  const renderHeader = () => {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-secondary-800">
            {testData?.title || 'Teste de Avaliação'}
          </h1>
          <div className="flex items-center">
            {timeRemaining !== null ? (
              // Se tem limite de tempo, mostrar apenas contador regressivo
              <div className={`text-lg font-medium ${timeRemaining < 300 ? 'text-red-600' : 'text-secondary-600'}`}>
                <span className="mr-2">⏱️</span>
                Tempo restante: {formatTimeRemaining()}
              </div>
            ) : (
              // Se não tem limite, mostrar apenas tempo decorrido
              <div className="text-lg font-medium text-secondary-600">
                <span className="mr-2">⏳</span>
                Tempo: {formatTimeSpent()}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-secondary-700 mb-1">
              {stageInfo?.title || 'Carregando...'}
            </h2>
            <p className="text-secondary-500">
              {currentStageIndex !== null && totalStages !== null
                ? `Etapa ${currentStageIndex + 1} de ${totalStages}`
                : 'Carregando...'}
            </p>
          </div>
          {stageCompleted && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Etapa concluída
            </div>
          )}
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
              alt="Admitto Logo"
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
        </header>

        <main className="max-w-4xl mx-auto">
          {renderHeader()}
          <div className="card mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">{stageInfo?.title}</h1>
                <p className="text-secondary-600">{stageInfo?.description}</p>
              </div>
              
              {testData && (
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <h2 className="text-lg font-semibold text-secondary-800">
                    {testData.title}
                  </h2>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div className="flex flex-wrap gap-1 max-w-full">
                {totalStages ? (
                  // Se temos o número total de etapas, usar esse valor
                  Array.from({ length: totalStages }, (_, i) => i).map((stepIndex) => (
                    <div 
                      key={stepIndex}
                      className={`w-6 h-2 rounded-full ${
                        currentStageIndex === stepIndex 
                          ? 'bg-primary-600' 
                          : currentStageIndex > stepIndex 
                            ? 'bg-primary-300' 
                            : 'bg-gray-200'
                      }`}
                    ></div>
                  ))
                ) : (
                  // Fallback para 3 etapas se não temos essa informação
                  [0, 1, 2].map((stepIndex) => (
                    <div 
                      key={stepIndex}
                      className={`w-6 h-2 rounded-full ${
                        currentStageIndex === stepIndex 
                          ? 'bg-primary-600' 
                          : currentStageIndex > stepIndex 
                            ? 'bg-primary-300' 
                            : 'bg-gray-200'
                      }`}
                    ></div>
                  ))
                )}
              </div>
              <div className="text-sm text-secondary-500">
                Etapa {currentStageIndex !== null ? currentStageIndex + 1 : '?'} de {totalStages || '?'}
              </div>
            </div>
          </div>

          {stageCompleted ? (
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4 text-green-500">✓</div>
              <h2 className="text-2xl font-bold text-secondary-900 mb-4">Etapa já concluída</h2>
              <p className="text-secondary-600 mb-6">
                Você já respondeu todas as questões desta etapa. 
                Utilize o botão abaixo para continuar para a próxima etapa.
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  goToNextStage();
                }}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </span>
                ) : (
                  'Próxima Etapa'
                )}
              </button>
            </div>
          ) : (
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
                          <span className="mr-2">{index + 1}.</span>
                          <span dangerouslySetInnerHTML={{ __html: question.text }} />
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
                                onClick={() => {
                                  // Log para depuração
                                  console.log(`Selecionada opção ${option.id} para pergunta ${question.id} (${index + 1}/${questions.length})`);
                                  
                                  // Verificar se é a última pergunta
                                  if (index === questions.length - 1) {
                                    console.log(`Esta é a última pergunta (${index + 1}/${questions.length})`);
                                  }
                                }}
                              />
                              <span className="text-secondary-700" dangerouslySetInnerHTML={{ __html: option.text }} />
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
                            type="button"
                            disabled={isSubmitting}
                            className="btn-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              if (checkAllQuestionsAnswered(values)) {
                                setIsSubmitting(true);
                                // Primeiro enviar as respostas
                                handleSubmit(values).then(success => {
                                  if (success) {
                                    // Se o envio foi bem-sucedido, avançar para a próxima etapa
                                    goToNextStage(values);
                                  } else {
                                    setIsSubmitting(false);
                                  }
                                }).catch(() => {
                                  setIsSubmitting(false);
                                });
                              }
                            }}
                          >
                            {isSubmitting ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Avançando...
                              </span>
                            ) : 'Próxima Etapa'}
                          </button>
                        )}
                        
                        {/* Mostrar o botão de finalizar teste apenas quando for a última etapa 
                            Para testes com 2 etapas, mostrar apenas na etapa 2 (índice 1)
                        */}
                        {((totalStages === 2 && currentStageIndex === 1) || 
                           (totalStages !== 2 && isLastStage) || 
                           (currentStageIndex !== null && totalStages !== null && currentStageIndex === totalStages - 1)) && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            className="btn-primary bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.preventDefault();
                              if (checkAllQuestionsAnswered(values)) {
                                setIsSubmitting(true);
                                // Primeiro enviar as respostas
                                handleSubmit(values).then(success => {
                                  if (success) {
                                    // Depois marcar a etapa como concluída
                                    fetch('/api/responses/mark-stage-completed', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        stageId: stageId as string,
                                        candidateId
                                      }),
                                    }).then(() => {
                                      // Finalmente finalizar o teste
                                      finalizeTest();
                                    }).catch(error => {
                                      console.error('Erro ao marcar etapa como concluída:', error);
                                      showToast('Erro ao finalizar teste. Por favor, tente novamente.', 'error');
                                      setIsSubmitting(false);
                                    });
                                  } else {
                                    setIsSubmitting(false);
                                  }
                                }).catch(error => {
                                  console.error('Erro ao enviar respostas:', error);
                                  showToast('Erro ao enviar respostas. Por favor, tente novamente.', 'error');
                                  setIsSubmitting(false);
                                });
                              }
                            }}
                          >
                            {isSubmitting ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Finalizando...
                              </span>
                            ) : 'Finalizar Teste'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </main>
      </div>
    </div>
  )
}

export default TestStage
