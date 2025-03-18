import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import AdminLayout from '../../../components/admin/AdminLayout'
import QuestionForm from '../../../components/admin/QuestionForm'
import { useNotification } from '../../../contexts/NotificationContext'
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
  options: Option[]
  categoryId?: string
  categoryName?: string
  categories?: Category[] // Mantido para compatibilidade com código existente
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
  const notifyContext = useNotification()
  const notify = useNotificationSystem()
  
  const [test, setTest] = useState<Test | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  
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
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false)
  
  // Estado para edição de nome de etapa
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  
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
        setLoading(true)
        
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
      console.log('Iniciando recarregamento de dados...');
      setLoading(true)
      
      // Buscar dados do teste
      console.log('Fazendo requisição para:', `/api/admin/tests/${id}`);
      const testResponse = await fetch(`/api/admin/tests/${id}`)
      if (!testResponse.ok) {
        throw new Error('Erro ao carregar os dados do teste')
      }
      const testData = await testResponse.json()
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
      }
      
      console.log('Adaptação concluída, atualizando estado...');
      setTest(adaptedTest)
      console.log('Estado atualizado com sucesso');
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
  const addStage = async (stageData: { title: string; description?: string; testId: string }) => {
    if (!stageData.testId || typeof stageData.testId !== 'string') return;
    if (!stageData.title.trim()) {
      notify.showWarning('O nome da etapa não pode estar vazio');
      return;
    }

    try {
      setLoading(true);
      console.log('[TestDetail] Adicionando nova etapa:', stageData.title);
      
      // Não vamos mais calcular a ordem aqui, deixaremos a API fazer isso
      // A API vai determinar a próxima ordem disponível com base nas etapas existentes
      console.log('[TestDetail] Solicitando à API para determinar a próxima ordem disponível');

      // Criar a nova etapa
      const response = await fetch('/api/admin/stages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[TestDetail] Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao adicionar nova etapa');
      }

      // Recarregar os dados do teste após adicionar a etapa
      await reloadTestData();
      
      notify.showSuccess('Etapa adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar etapa:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Função para adicionar uma etapa ao teste
  const addStageToTest = async () => {
    if (!newStageName.trim()) {
      notify.showError('O nome da etapa é obrigatório');
      return;
    }

    try {
      await addStage({
        title: newStageName,
        description: newStageDescription,
        testId: id as string,
      });

      // Limpar os campos
      setNewStageName('');
      setNewStageDescription('');
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
    setShowAddQuestionsModal(true)
  }

  // Identificar todas as perguntas que já estão sendo usadas no teste atual
  const questionsAlreadyInTest = test?.testStages?.flatMap(testStage => 
    testStage.stage.questionStages?.map(qs => qs.questionId) || []
  ) || [];

  const filteredQuestions = availableQuestions.filter(question => {
    // Excluir perguntas que já estão sendo usadas no teste
    if (questionsAlreadyInTest.includes(question.id)) {
      return false;
    }
    
    // Filtro por categoria
    if (selectedCategory !== 'all') {
      if (!question.categoryId || question.categoryId !== selectedCategory) {
        return false
      }
    }
    
    // Filtro por dificuldade (temporariamente desativado)
    // if (selectedDifficulty !== 'all' && question.difficulty !== selectedDifficulty) {
    //   return false
    // }
    
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
    }
  }

  const removeQuestionFromStage = (stageId: string, questionId: string) => {
    console.log(`[Frontend] Removendo questão ${questionId} da etapa ${stageId}...`);
    notify.confirm(
      'Remover Pergunta',
      'Tem certeza que deseja remover esta pergunta da etapa? Esta ação não pode ser desfeita.',
      async () => {
        try {
          console.log(`[Frontend] Enviando requisição DELETE para /api/admin/stages/${stageId}/questions/${questionId}`);
          const response = await fetch(`/api/admin/stages/${stageId}/questions/${questionId}`, {
            method: 'DELETE',
          })

          console.log(`[Frontend] Resposta recebida: status ${response.status}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`[Frontend] Erro ao remover pergunta: ${JSON.stringify(errorData)}`);
            throw new Error(errorData.error || 'Erro ao remover pergunta da etapa');
          }

          const result = await response.json()
          console.log(`[Frontend] Pergunta removida com sucesso: ${JSON.stringify(result)}`);

          // Atualizar apenas a etapa afetada no estado local
          if (test && test.testStages) {
            // Encontrar o testStage que contém a etapa afetada
            const updatedTestStages = test.testStages.map(testStage => {
              // Se não for a etapa que estamos modificando, retorna sem alterações
              if (testStage.stageId !== stageId) return testStage;
              
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
            
            notify.showSuccess(result.message || 'Pergunta removida da etapa com sucesso!')
          } else {
            // Caso haja algum problema com o estado, recarregar todos os dados
            await reloadTestData();
            notify.showSuccess(result.message || 'Pergunta removida da etapa com sucesso!')
          }
        } catch (error) {
          console.error('Erro:', error)
          notify.showError(error instanceof Error ? error.message : 'Ocorreu um erro ao remover a pergunta. Por favor, tente novamente.')
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
                              {index + 1}. {editingStageId === testStage.id ? (
                                <input
                                  type="text"
                                  value={editingStageName}
                                  onChange={(e) => setEditingStageName(e.target.value)}
                                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                  placeholder="Digite o nome da etapa"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateStageName(testStage.id, editingStageName);
                                    } else if (e.key === 'Escape') {
                                      cancelEditingStageName();
                                    }
                                  }}
                                />
                              ) : (
                                <div className="flex items-center">
                                  <span>{testStage.stage.title}</span>
                                  <button 
                                    onClick={() => startEditingStageName(testStage.id, testStage.stage.title)}
                                    className="ml-2 text-primary-600 hover:text-primary-800 focus:outline-none"
                                    title="Editar nome da etapa"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </h3>
                            {testStage.stage.description && (
                              <p className="mt-1 text-sm text-secondary-600">{testStage.stage.description}</p>
                            )}
                          </div>
                          <div>
                            {editingStageId === testStage.id ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => updateStageName(testStage.id, editingStageName)}
                                  className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={cancelEditingStageName}
                                  className="px-3 py-1 text-xs text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div>
                                <button
                                  onClick={() => openAddQuestionsModal(testStage.stage.id)}
                                  className="px-3 py-1 text-xs text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50 mb-2 block w-full"
                                >
                                  Adicionar Perguntas
                                </button>
                                <button
                                  onClick={() => handleDeleteStage(testStage.stage.id)}
                                  className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-md hover:bg-red-50 block w-full"
                                >
                                  Remover Etapa
                                </button>
                              </div>
                            )}
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
                                          {/* Dificuldade temporariamente desativada */}
                                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                            Sem dificuldade
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
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
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
                          {/* Dificuldade temporariamente desativada */}
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Sem dificuldade
                          </span>
                          
                          {question.categories && question.categories.map(category => (
                            <span 
                              key={category.id}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
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
    </AdminLayout>
  )
}

export default TestDetail