import { NextPage } from 'next'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import AdminLayout from '../../../components/admin/AdminLayout'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import QuestionForm from '../../../components/admin/QuestionForm'
import OpinionQuestionWizard from '../../../components/admin/OpinionQuestionWizard'
import AddStageModal from '../../../components/admin/AddStageModal'
import AddQuestionsModal from '../../../components/admin/AddQuestionsModal'
import QuestionTypeModal from '../../../components/admin/QuestionTypeModal'
import NewQuestionModal from '../../../components/admin/NewQuestionModal'
import LoadingOverlay from '../../../components/common/LoadingOverlay'
import TestStagesList from '../../../components/admin/TestStagesList'
import DeletedQuestionsHandler from '../../../components/admin/DeletedQuestionsHandler'
import { useNotification } from '../../../contexts/NotificationContext'
import { useNotificationSystem } from '../../../hooks/useNotificationSystem'
import { Question, TestStage, QuestionType, QuestionDifficulty } from '@/types/questions'

interface Test {
  id: string
  title: string
  description: string | null
  timeLimit: number | null
  active: boolean
  stages: any[]
  testStages?: TestStage[] // Adicionado para compatibilidade
}

interface Stage {
  id: string
  title: string
  description: string | null
  order: number
  questions: Question[]
  questionStages?: any[] // Adicionado para compatibilidade
  questionType?: string // Tipo de pergunta permitido nesta etapa
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

interface Category {
  id: string
  name: string
}

const TestDetail: NextPage = () => {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const notifyContext = useNotification()
  const notify = useNotificationSystem()
  
  const [test, setTest] = useState<Test | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [pageLoading, setPageLoading] = useState(true) // Loading inicial da página
  const [testDataLoading, setTestDataLoading] = useState(false) // Loading para recarregar dados do teste
  const [questionLoading, setQuestionLoading] = useState(false) // Loading para operações com perguntas
  const [stageLoading, setStageLoading] = useState(false) // Loading para operações com etapas
  
  // Estado para armazenar logs de depuração
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Função para adicionar logs de depuração
  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  // Modal states
  const [showAddStageModal, setShowAddStageModal] = useState(false)
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [newStageName, setNewStageName] = useState('')
  const [newStageDescription, setNewStageDescription] = useState('')
  const [newStageQuestionType, setNewStageQuestionType] = useState('')
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false)
  const [showOpinionQuestionForm, setShowOpinionQuestionForm] = useState(false)
  const [showQuestionTypeModal, setShowQuestionTypeModal] = useState(false)
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('')
  
  // Estado para edição de nome de etapa
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  
  // Estado para armazenar o tipo de pergunta da etapa selecionada
  const [selectedStageQuestionType, setSelectedStageQuestionType] = useState<string | null>(null);
  
  // Ref para controlar se já carregamos os dados
  const hasLoadedDataRef = useRef(false);
  
  // Remover os estados e funções relacionados à verificação antiga de perguntas excluídas
  // que agora será feita pelo componente DeletedQuestionsHandler
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!id || typeof id !== 'string') return

      try {
        console.log(`[TestDetail] Iniciando carregamento de dados para o teste ID: ${id}`)
        addDebugLog(`Iniciando carregamento de dados para o teste ID: ${id}`)
        setPageLoading(true)
        
        // Buscar dados do teste
        console.log(`[TestDetail] Fazendo requisição para /api/admin/tests/${id}`)
        addDebugLog(`Fazendo requisição para /api/admin/tests/${id}`)
        const testResponse = await fetch(`/api/admin/tests/${id}`)
        if (!testResponse.ok) {
          throw new Error('Erro ao carregar os dados do teste')
        }
        
        const testData = await testResponse.json()
        console.log(`[TestDetail] Dados do teste recebidos:`, testData)
        addDebugLog(`Dados do teste recebidos: ${testData.title}`)
        
        if (testData.stages && testData.stages.length > 0) {
          console.log('[TestDetail] Ordens das etapas ANTES de ordenar:', testData.stages.map(s => ({
            id: s.id,
            testStageId: s.testStageId,
            title: s.title,
            order: s.order
          })))
          
          addDebugLog(`Etapas encontradas: ${testData.stages.length}`)
          testData.stages.forEach((stage, index) => {
            addDebugLog(`Etapa ${index+1}: "${stage.title}" (ordem: ${stage.order})`)
          })
        }
        
        // Garantir que as etapas estejam ordenadas corretamente
        const orderedStages = testData.stages ? [...testData.stages].sort((a, b) => a.order - b.order) : []
        
        if (orderedStages.length > 0) {
          console.log('[TestDetail] Ordens das etapas DEPOIS de ordenar:', orderedStages.map(s => ({
            id: s.id,
            testStageId: s.testStageId,
            title: s.title,
            order: s.order
          })))
          
          addDebugLog(`Etapas após ordenação:`)
          orderedStages.forEach((stage, index) => {
            addDebugLog(`Etapa ${index+1}: "${stage.title}" (ordem: ${stage.order})`)
          })
        }
        
        // Adaptar a estrutura de dados para o formato esperado pelo componente
        const adaptedTest = {
          ...testData,
          testStages: orderedStages.map(stage => ({
            id: stage.testStageId, // Usar o ID da relação TestStage em vez de criar um ID
            testId: testData.id,
            stageId: stage.id,
            order: typeof stage.order === 'number' ? stage.order : 0,
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
          }))
        }
        
        console.log('[TestDetail] Estrutura de dados adaptada com sucesso:', {
          testId: adaptedTest.id,
          totalStages: adaptedTest.testStages?.length || 0,
          stagesOrder: adaptedTest.testStages?.map(ts => ({ 
            stageId: ts.stageId, 
            testStageId: ts.id,
            order: ts.order,
            title: ts.stage.title
          }))
        })
        
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
        console.error('Erro ao carregar dados:', error)
        notify.showError('Não foi possível carregar os dados do teste. Por favor, tente novamente.')
      } finally {
        setPageLoading(false)
      }
    }

    if (status === 'authenticated' && id && !hasLoadedDataRef.current) {
      hasLoadedDataRef.current = true;
      fetchData();
    }
  }, [id, status, notify])

  // Função para recarregar os dados do teste
  const reloadTestData = useCallback(async () => {
    if (!id || typeof id !== 'string') return;

    try {
      console.log('Iniciando recarregamento de dados...');
      setTestDataLoading(true);
      
      // Buscar dados do teste
      console.log('Fazendo requisição para:', `/api/admin/tests/${id}`);
      const testResponse = await fetch(`/api/admin/tests/${id}`);
      if (!testResponse.ok) {
        throw new Error('Erro ao carregar os dados do teste');
      }
      const testData = await testResponse.json();
      console.log('Dados recebidos da API:', testData);
      
      if (testData.stages && testData.stages.length > 0) {
        console.log('Ordens das etapas ANTES de ordenar:', testData.stages.map(s => ({ id: s.id, title: s.title, order: s.order })));
      }
      
      // Garantir que as etapas estejam ordenadas corretamente
      const orderedStages = testData.stages ? [...testData.stages].sort((a, b) => a.order - b.order) : [];
      
      if (orderedStages.length > 0) {
        console.log('Ordens das etapas DEPOIS de ordenar:', orderedStages.map(s => ({ id: s.id, title: s.title, order: s.order })));
      }
      
      // Adaptar a estrutura de dados para o formato esperado pelo componente
      const adaptedTest = {
        ...testData,
        testStages: orderedStages.map(stage => ({
          id: stage.testStageId, // Usar o ID da relação TestStage em vez de criar um ID
          testId: testData.id,
          stageId: stage.id,
          order: typeof stage.order === 'number' ? stage.order : 0,
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
        }))
      };
      
      console.log('Adaptação concluída, atualizando estado...');
      setTest(adaptedTest);
      console.log('Estado atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
      notify.showError('Não foi possível recarregar os dados do teste. Por favor, tente novamente.');
    } finally {
      setTestDataLoading(false);
    }
  }, [id, notify]);
  
  // Função para ser chamada após a remoção de perguntas excluídas
  const handleDeletedQuestionsRemoved = useCallback(() => {
    reloadTestData();
    notify.showSuccess('Perguntas excluídas removidas com sucesso. O teste foi atualizado.');
  }, [reloadTestData, notify]);

  // Função para atualizar a ordem de uma etapa
  const updateStageOrder = async (stageId: string, newOrder: number) => {
    try {
      setStageLoading(true)
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
    } finally {
      setStageLoading(false)
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

  // Função para atualizar o nome da etapa
  const updateStageName = async (testStageId: string, newName: string) => {
    if (!newName.trim()) {
      notify.showWarning('O nome da etapa não pode estar vazio');
      return;
    }

    try {
      console.log('Iniciando atualização do nome da etapa:', testStageId, newName);
      
      // Encontrar a etapa atual usando o testStageId
      const currentTestStage = test?.testStages?.find(ts => ts.id === testStageId);
      if (!currentTestStage) {
        throw new Error('Etapa não encontrada');
      }
      
      console.log('Etapa encontrada:', currentTestStage);
      console.log('Enviando PATCH para:', `/api/admin/stages/${currentTestStage.stageId}`);

      // Atualizar apenas o título da etapa (stageId é o ID da tabela Stage)
      const response = await fetch(`/api/admin/stages/${currentTestStage.stageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: newName
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar o nome da etapa');
      }

      // Resultado da API contém o testStageId
      const updatedStage = await response.json();
      console.log('Resposta da API:', updatedStage);
      
      // Em vez de recarregar todos os dados, apenas atualizamos localmente
      // o nome da etapa no estado, mantendo a ordem existente
      const updatedTestStages = test?.testStages?.map(ts => {
        if (ts.id === testStageId) {
          return {
            ...ts,
            stage: {
              ...ts.stage,
              title: newName
            }
          };
        }
        return ts;
      });
      
      if (test && updatedTestStages) {
        setTest({
          ...test,
          testStages: updatedTestStages
        });
      }
      
      console.log('Dados atualizados localmente');
      notify.showSuccess('Nome da etapa atualizado com sucesso!');
      
      // Limpar estado de edição
      setEditingStageId(null);
      setEditingStageName('');
    } catch (error) {
      console.error('Erro:', error);
      notify.showError('Ocorreu um erro ao atualizar o nome da etapa. Por favor, tente novamente.');
    }
  };

  // Função para iniciar a edição do nome da etapa
  const startEditingStageName = (testStageId: string, currentName: string) => {
    setEditingStageId(testStageId)
    setEditingStageName(currentName)
  }

  // Função para cancelar a edição do nome da etapa
  const cancelEditingStageName = () => {
    setEditingStageId(null)
    setEditingStageName('')
  }

  // Função para adicionar uma nova etapa ao teste
  const addStage = async (stageData: { title: string; description?: string; testId: string; questionType: string }) => {
    if (!stageData.testId || typeof stageData.testId !== 'string') return;
    if (!stageData.title.trim()) {
      notify.showWarning('O nome da etapa não pode estar vazio');
      return;
    }

    try {
      const response = await fetch(`/api/admin/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: stageData.title,
          description: stageData.description,
          testId: stageData.testId,
          questionType: stageData.questionType
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar etapa');
      }

      const newStage = await response.json();
      
      // Associar a etapa ao teste
      const testStageResponse = await fetch(`/api/admin/tests/${stageData.testId}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: newStage.id,
          order: test?.testStages?.length || 0,
        }),
      });

      if (!testStageResponse.ok) {
        throw new Error('Erro ao associar etapa ao teste');
      }

      return newStage;
    } catch (error) {
      console.error('Erro ao adicionar etapa:', error);
      notify.showError('Ocorreu um erro ao adicionar a etapa');
      throw error;
    }
  };

  // Função para adicionar uma etapa ao teste
  const handleAddStage = async (name: string, description: string, questionType: string) => {
    if (!name.trim()) {
      notify.showError('O nome da etapa é obrigatório');
      return;
    }
    
    if (!questionType) {
      notify.showError('O tipo de pergunta é obrigatório');
      return;
    }

    try {
      await addStage({
        title: name,
        description: description,
        testId: id as string,
        questionType: questionType
      });

      // Fechar o modal
      setShowAddStageModal(false);

      // Recarregar os dados do teste
      await reloadTestData();
      
      notify.showSuccess('Etapa adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar etapa:', error);
      notify.showError(error instanceof Error ? error.message : 'Erro ao adicionar nova etapa');
    }
  }

  const handleDeleteStage = (stageId: string) => {
    notify.confirm(
      'Excluir Etapa',
      'Tem certeza que deseja excluir esta etapa? Esta ação não pode ser desfeita.',
      async () => {
        try {
          console.log(`[TestDetail] Excluindo etapa com ID: ${stageId}`);
          
          // Verificar se o ID da etapa é válido
          if (!stageId || typeof stageId !== 'string') {
            throw new Error('ID da etapa inválido');
          }
          
          const response = await fetch(`/api/admin/stages/${stageId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // Se o status for 404, a etapa não foi encontrada
            if (response.status === 404) {
              throw new Error('Etapa não encontrada');
            }
            
            // Para outros erros, tentar obter a mensagem de erro da API
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erro ao excluir etapa');
          }

          // Recarregar os dados do teste
          await reloadTestData();
          
          notify.showSuccess('Etapa excluída com sucesso!');
        } catch (error) {
          console.error('Erro ao excluir etapa:', error);
          notify.showError(error instanceof Error ? error.message : 'Ocorreu um erro ao excluir a etapa');
        }
      },
      {
        type: 'warning',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      }
    );
  };

  const openAddQuestionsModal = (stageId: string) => {
    setSelectedStageId(stageId)
    setSelectedQuestions([])
    
    // Resetar os filtros quando abrir o modal
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    
    // Encontrar a etapa selecionada para obter o tipo de pergunta
    const selectedTestStage = test?.testStages?.find(ts => ts.stage.id === stageId);
    if (selectedTestStage && selectedTestStage.stage.questionType) {
      console.log(`[OpenModal] Definindo tipo de pergunta: ${selectedTestStage.stage.questionType}`);
      setSelectedStageQuestionType(selectedTestStage.stage.questionType);
    } else {
      console.log('[OpenModal] Etapa não encontrada ou sem tipo de pergunta definido');
      setSelectedStageQuestionType(null);
    }
    
    setShowAddQuestionsModal(true)
    
    // Buscar perguntas disponíveis após abrir o modal
    fetchAvailableQuestions(stageId)
  }

  // Identificar todas as perguntas que já estão sendo usadas no teste atual
  const questionsAlreadyInTest = test?.testStages?.flatMap(testStage => 
    testStage.stage.questionStages?.map(qs => qs.questionId) || []
  ) || [];

  // Função para buscar perguntas disponíveis
  const fetchAvailableQuestions = async (stageId: string) => {
    setQuestionLoading(true);
    try {
      // Primeiro, buscar a etapa para obter o tipo de pergunta
      const stageResponse = await fetch(`/api/admin/stages/${stageId}`);
      if (!stageResponse.ok) {
        throw new Error('Erro ao buscar detalhes da etapa');
      }
      const stageData = await stageResponse.json();
      const questionType = stageData.questionType;
      
      console.log(`[AddQuestions] Tipo de pergunta da etapa: ${questionType}`);
      
      // Armazenar o tipo de pergunta da etapa selecionada
      setSelectedStageQuestionType(questionType);
      
      // Buscar todas as perguntas disponíveis
      const response = await fetch(`/api/admin/questions?questionType=selection`);
      if (!response.ok) {
        throw new Error('Erro ao buscar perguntas disponíveis');
      }
      
      const data = await response.json();
      console.log(`[AddQuestions] Perguntas recebidas: ${data.length}`);
      
      // Processar perguntas para garantir que todas tenham a propriedade categories
      const processedQuestions = data.map(question => {
        // Se a pergunta não tem categories mas tem categoryId e categoryName
        if ((!question.categories || question.categories.length === 0) && question.categoryId && question.categoryName) {
          return {
            ...question,
            categories: [{
              id: question.categoryId,
              name: question.categoryName
            }]
          };
        }
        return question;
      });
      
      // Log detalhado das perguntas recebidas
      processedQuestions.forEach((question) => {
        console.log(`[AddQuestions] Pergunta ID: ${question.id}, Tipo: ${question.type}, Dificuldade: ${question.difficulty}`);
        if (question.categories && question.categories.length > 0) {
          console.log(`[AddQuestions] Categorias: ${question.categories.map(c => c.name).join(', ')}`);
        } else if (question.categoryName) {
          console.log(`[AddQuestions] Categoria: ${question.categoryName}`);
        }
      });
      
      setAvailableQuestions(processedQuestions);
      
      // Buscar todas as categorias
      const categoriesResponse = await fetch('/api/admin/categories');
      if (!categoriesResponse.ok) {
        throw new Error('Erro ao carregar as categorias');
      }
      const categoriesData = await categoriesResponse.json();
      console.log(`[AddQuestions] Categorias recebidas: ${categoriesData.length}`);
      categoriesData.forEach(cat => {
        console.log(`[AddQuestions] Categoria: ${cat.id} - ${cat.name}`);
      });
      setAvailableCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao buscar perguntas disponíveis:', error);
      notify.showError('Erro ao buscar perguntas disponíveis');
    } finally {
      setQuestionLoading(false);
    }
  };

  // Garantir que availableQuestions seja sempre um array antes de aplicar o filtro
  const filteredQuestions = (Array.isArray(availableQuestions) ? availableQuestions : []).filter(question => {
    // Excluir perguntas que já estão sendo usadas no teste
    if (questionsAlreadyInTest.includes(question.id)) {
      console.log(`[Filter] Pergunta ${question.id} rejeitada: já está sendo usada no teste`);
      return false;
    }
    
    // Filtrar pelo tipo de pergunta da etapa selecionada
    // Verificação mais robusta para garantir que o tipo corresponda
    if (selectedStageQuestionType) {
      // Garantir que estamos comparando strings
      const questionType = String(question.type || '').toUpperCase();
      const stageType = String(selectedStageQuestionType).toUpperCase();
      
      console.log(`[Filter] Comparando tipos: pergunta=${questionType}, etapa=${stageType}`);
      
      if (questionType !== stageType) {
        console.log(`[Filter] Pergunta ${question.id} rejeitada: tipo ${questionType} não corresponde ao tipo da etapa ${stageType}`);
        return false;
      }
    }
    
    // Filtro por categoria
    if (selectedCategory !== 'all') {
      // Verificar se a pergunta tem categorias
      if (!question.categories || question.categories.length === 0) {
        // Se a pergunta não tem categorias, verificar se tem categoryId
        if (!question.categoryId || question.categoryId !== selectedCategory) {
          console.log(`[Filter] Pergunta ${question.id} rejeitada: não tem a categoria selecionada`);
          return false;
        }
      } else {
        // Se a pergunta tem categorias, verificar se alguma corresponde ao filtro
        if (!question.categories.some(cat => cat.id === selectedCategory)) {
          console.log(`[Filter] Pergunta ${question.id} rejeitada: categoria não corresponde`);
          return false;
        }
      }
    }
    
    // Filtro por dificuldade
    if (selectedDifficulty !== 'all') {
      if (question.difficulty !== selectedDifficulty) {
        console.log(`[Filter] Pergunta ${question.id} rejeitada: dificuldade não corresponde`);
        return false;
      }
    }
    
    console.log(`[Filter] Pergunta ${question.id} aceita: tipo ${question.type}, etapa ${selectedStageQuestionType}`);
    return true;
  });

  const toggleQuestionSelection = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId))
    } else {
      setSelectedQuestions([...selectedQuestions, questionId])
    }
  }

  // Função para selecionar ou desmarcar múltiplas perguntas de uma vez
  const toggleMultipleQuestions = (questionIds: string[], select: boolean) => {
    if (select) {
      // Adicionar todas as perguntas que ainda não estão selecionadas
      const newSelectedQuestions = [...selectedQuestions];
      questionIds.forEach(id => {
        if (!newSelectedQuestions.includes(id)) {
          newSelectedQuestions.push(id);
        }
      });
      setSelectedQuestions(newSelectedQuestions);
    } else {
      // Remover todas as perguntas especificadas
      setSelectedQuestions(selectedQuestions.filter(id => !questionIds.includes(id)));
    }
  }

  const addQuestionsToStage = async () => {
    if (!selectedStageId || selectedQuestions.length === 0) {
      notify.showError('Selecione pelo menos uma pergunta para adicionar à etapa')
      return
    }

    try {
      setQuestionLoading(true)
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao adicionar perguntas à etapa')
      }

      // Obter os dados da resposta da API
      const result = await response.json()
      console.log('Perguntas adicionadas:', result)

      // Atualizar apenas a etapa afetada no estado local
      if (test && test.testStages && result.associations) {
        // Buscar as perguntas completas que foram adicionadas
        const addedQuestionIds = result.associations.map(assoc => assoc.questionId)
        const addedQuestionsResponse = await fetch(`/api/admin/questions?ids=${addedQuestionIds.join(',')}`)
        const addedQuestionsData = await addedQuestionsResponse.json()
        
        // Encontrar o testStage que contém a etapa afetada
        const updatedTestStages = test.testStages.map(testStage => {
          // Se não for a etapa que estamos modificando, retorna sem alterações
          if (testStage.stageId !== selectedStageId) return testStage
          
          // Criar novos questionStages para as perguntas adicionadas
          const newQuestionStages = addedQuestionsData.map((question, index) => ({
            id: `${testStage.stageId}_${question.id}`,
            questionId: question.id,
            stageId: testStage.stageId,
            order: (testStage.stage.questionStages?.length || 0) + index,
            question: question
          }))
          
          // Se for a etapa afetada, adiciona as novas perguntas à lista de questionStages
          return {
            ...testStage,
            stage: {
              ...testStage.stage,
              questionStages: [
                ...(testStage.stage.questionStages || []),
                ...newQuestionStages
              ]
            }
          }
        })

        // Atualizar o estado com as alterações locais
        setTest({
          ...test,
          testStages: updatedTestStages
        })
        
        notify.showSuccess('Perguntas adicionadas com sucesso!')
      } else {
        // Caso haja algum problema com o estado ou com a resposta da API, recarregar todos os dados
        await reloadTestData()
        notify.showSuccess('Perguntas adicionadas com sucesso!')
      }

      // Limpar a seleção
      setSelectedQuestions([])
      setSelectedStageId('')
      setShowAddQuestionsModal(false)
    } catch (error) {
      console.error('Erro:', error)
      notify.showError(error instanceof Error ? error.message : 'Ocorreu um erro ao adicionar as perguntas. Por favor, tente novamente.')
    } finally {
      setQuestionLoading(false)
    }
  }

  const removeQuestionFromStage = (stageId: string, questionId: string) => {
    console.log(`[Frontend] Removendo questão ${questionId} da etapa ${stageId}...`);
    notify.confirm(
      'Remover Pergunta',
      'Tem certeza que deseja remover esta pergunta da etapa? Esta ação não pode ser desfeita.',
      async () => {
        try {
          // Usar o endpoint que não requer papel de administrador
          console.log(`[Frontend] Enviando requisição DELETE para /api/admin/stages/${stageId}/questions`);
          
          // Primeiro, obter a lista de perguntas atual da etapa
          const stageResponse = await fetch(`/api/admin/stages/${stageId}`);
          if (!stageResponse.ok) {
            throw new Error('Erro ao obter detalhes da etapa');
          }
          
          const stageData = await stageResponse.json();
          console.log(`[Frontend] Etapa obtida: ${stageData.id}, ${stageData.title}`);
          
          // Obter todas as perguntas da etapa
          const questionsResponse = await fetch(`/api/admin/stages/${stageId}/questions`);
          if (!questionsResponse.ok) {
            throw new Error('Erro ao obter perguntas da etapa');
          }
          
          const questions = await questionsResponse.json();
          console.log(`[Frontend] Perguntas obtidas: ${questions.length}`);
          
          // Filtrar a pergunta a ser removida
          const remainingQuestions = questions.filter(q => q.id !== questionId);
          console.log(`[Frontend] Perguntas restantes: ${remainingQuestions.length}`);
          
          // Atualizar a etapa com as perguntas restantes
          const updateResponse = await fetch(`/api/admin/stages/${stageId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              questions: remainingQuestions.map(q => ({ id: q.id }))
            }),
          });
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error(`[Frontend] Erro ao atualizar etapa: ${JSON.stringify(errorData)}`);
            throw new Error(errorData.error || 'Erro ao remover pergunta da etapa');
          }
          
          const result = await updateResponse.json();
          console.log(`[Frontend] Etapa atualizada com sucesso: ${JSON.stringify(result)}`);

          // Atualizar apenas a etapa afetada no estado local
          if (test && test.testStages) {
            // Encontrar o testStage que contém a etapa afetada
            const updatedTestStages = test.testStages.map(testStage => {
              // Se não for a etapa que estamos modificando, retorna sem alterações
              if (testStage.stageId !== stageId) return testStage
              
              // Se for a etapa afetada, remove a pergunta da lista de questionStages
              return {
                ...testStage,
                stage: {
                  ...testStage.stage,
                  questionStages: testStage.stage.questionStages?.filter(
                    qs => qs.questionId !== questionId
                  ) || []
                }
              };
            });

            // Atualizar o estado com as alterações locais
            setTest({
              ...test,
              testStages: updatedTestStages
            });
            
            notify.showSuccess('Pergunta removida da etapa com sucesso!')
          } else {
            // Caso haja algum problema com o estado, recarregar todos os dados
            await reloadTestData()
            notify.showSuccess('Pergunta removida da etapa com sucesso!')
          }
        } catch (error) {
          console.error('Erro ao remover pergunta:', error)
          notify.showError(error instanceof Error ? error.message : 'Ocorreu um erro ao remover a pergunta')
        }
      },
      {
        type: 'warning',
        confirmText: 'Remover',
        cancelText: 'Cancelar',
      }
    )
  }

  const handleCreateQuestion = async (values: any, formikHelpers?: any) => {
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          stageId: selectedStageId || null,
          type: selectedQuestionType || QuestionType.MULTIPLE_CHOICE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar pergunta');
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

  const handleDeleteQuestion = (questionId: string) => {
    notify.confirm(
      'Excluir Pergunta',
      'Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.',
      async () => {
        try {
          const response = await fetch(`/api/admin/questions/${questionId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Erro ao excluir pergunta');
          }

          // Recarregar as perguntas
          const questionsResponse = await fetch('/api/admin/questions');
          const questionsData = await questionsResponse.json();
          setAvailableQuestions(questionsData);

          notify.showSuccess('Pergunta excluída com sucesso!');
        } catch (error) {
          console.error('Erro:', error);
          notify.showError(error instanceof Error ? error.message : 'Ocorreu um erro ao excluir a pergunta');
        }
      },
      {
        type: 'warning',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      }
    );
  };

  if (status === 'loading' || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <LoadingOverlay isLoading={true} message="Carregando página..." />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
  }

  if (!test) {
    return (
      <AdminLayout activeSection="selecao">
        <div className="p-6">
          <div className="container mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-xl font-semibold text-secondary-800 mb-2">Teste não encontrado</h2>
              <p className="text-secondary-600 mb-4">O teste solicitado não foi encontrado ou você não tem permissão para acessá-lo.</p>
              <Link 
                href="/admin/tests"
                className="px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
              >
                Voltar para a lista de testes
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout activeSection="selecao">
      <div className="p-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <Link href="/admin/tests" className="text-primary-600 hover:text-primary-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar para a lista de testes
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
                  <span key="status-tag" className={`px-2 py-1 text-xs rounded-full ${test.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {test.active ? 'Ativo' : 'Inativo'}
                  </span>
                  {test.timeLimit && (
                    <span key="time-limit-tag" className="text-sm text-secondary-600">
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
                <p    className="text-secondary-600">Este teste ainda não possui etapas.</p>
                <button
                  onClick={() => setShowAddStageModal(true)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-800"
                >
                  Adicionar uma etapa
                </button>
              </div>
            ) : (
              <TestStagesList 
                testStages={test.testStages}
                stageLoading={stageLoading}
                testDataLoading={testDataLoading}
                editingStageId={editingStageId}
                editingStageName={editingStageName}
                setEditingStageName={setEditingStageName}
                startEditingStageName={startEditingStageName}
                updateStageName={updateStageName}
                cancelEditingStageName={cancelEditingStageName}
                openAddQuestionsModal={openAddQuestionsModal}
                handleDeleteStage={handleDeleteStage}
                removeQuestionFromStage={removeQuestionFromStage}
                moveStageToTop={moveStageToTop}
                moveStageUp={moveStageUp}
                moveStageDown={moveStageDown}
                moveStageToBottom={moveStageToBottom}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal para adicionar etapa */}
      <AddStageModal 
        isOpen={showAddStageModal}
        onClose={() => setShowAddStageModal(false)}
        onAdd={handleAddStage}
      />

      {/* Modal para adicionar perguntas à etapa */}
      <AddQuestionsModal
        isOpen={showAddQuestionsModal}
        onClose={() => setShowAddQuestionsModal(false)}
        onAdd={addQuestionsToStage}
        availableQuestions={availableQuestions}
        selectedQuestions={selectedQuestions}
        toggleQuestionSelection={toggleQuestionSelection}
        toggleMultipleQuestions={toggleMultipleQuestions}
        questionLoading={questionLoading}
        availableCategories={availableCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedDifficulty={selectedDifficulty}
        setSelectedDifficulty={setSelectedDifficulty}
        filteredQuestions={filteredQuestions}
        onCreateNewQuestion={() => setShowQuestionTypeModal(true)}
      />

      {/* Modal para escolher o tipo de pergunta */}
      <QuestionTypeModal
        isOpen={showQuestionTypeModal}
        onClose={() => setShowQuestionTypeModal(false)}
        onSelectMultipleChoice={() => {
          setSelectedQuestionType(QuestionType.MULTIPLE_CHOICE);
          setShowQuestionTypeModal(false);
          setShowNewQuestionForm(true);
        }}
        selectedStageId={selectedStageId}
      />
      
      {/* Modal para criar nova pergunta */}
      <NewQuestionModal
        isOpen={showNewQuestionForm}
        onClose={() => setShowNewQuestionForm(false)}
        onSubmit={handleCreateQuestion}
        onSuccess={() => {
          notify.showSuccess('Pergunta criada com sucesso!');
          setShowNewQuestionForm(false);
        }}
        stages={stages}
        categories={categories}
        selectedStageId={selectedStageId}
        selectedQuestionType={selectedQuestionType || QuestionType.MULTIPLE_CHOICE}
      />
      
      {/* Componente para verificar e remover perguntas excluídas */}
      {test && (
        <DeletedQuestionsHandler 
          testId={test.id} 
          testStages={test.testStages} 
          onQuestionsRemoved={handleDeletedQuestionsRemoved} 
        />
      )}
    </AdminLayout>
  )
}

export default TestDetail