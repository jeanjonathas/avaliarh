import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import AdminLayout from '../../components/admin/AdminLayout'
import QuestionForm from '../../components/admin/QuestionForm'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

interface Stage {
  id: string
  title: string
  order: number
}

interface Question {
  id: string
  text: string
  stageId: string
  categoryUuid?: string
  categoryName?: string
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
  const notify = useNotificationSystem();
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
  const [showAssociateDialog, setShowAssociateDialog] = useState(false)
  const [pendingFormValues, setPendingFormValues] = useState<any>(null)
  const [selectedTestName, setSelectedTestName] = useState('')
  const [selectedStageName, setSelectedStageName] = useState('')
  const [associationMode, setAssociationMode] = useState<'test' | 'test-and-stage' | 'none'>('none')
  const [categories, setCategories] = useState<any[]>([])
  const [filterType, setFilterType] = useState<'test' | 'category'>('test')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTests(),
        loadStages(),
        loadQuestions(),
        loadCategories()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Ocorreu um erro ao carregar os dados. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para carregar testes
  const loadTests = async () => {
    try {
      const response = await fetch('/api/admin/tests')
      if (!response.ok) {
        throw new Error('Erro ao carregar os testes')
      }
      const data = await response.json()
      setTests(data.tests || [])
    } catch (error) {
      console.error('Erro ao buscar testes:', error)
      setError('Ocorreu um erro ao carregar os testes. Por favor, tente novamente.')
    }
  }

  // Função para carregar etapas
  const loadStages = async () => {
    try {
      const response = await fetch('/api/admin/stages')
      if (!response.ok) {
        throw new Error('Erro ao carregar as etapas')
      }
      const data = await response.json()
      setStages(data)
    } catch (error) {
      console.error('Erro ao buscar etapas:', error)
      setError('Ocorreu um erro ao carregar as etapas. Por favor, tente novamente.')
    }
  }

  // Função para carregar perguntas
  const loadQuestions = async () => {
    setLoading(true);
    try {
      console.log('Carregando todas as perguntas...');
      const response = await fetch('/api/admin/questions')
      if (!response.ok) {
        throw new Error('Erro ao carregar as perguntas')
      }
      const data = await response.json()
      console.log('Perguntas carregadas:', data.length);
      setQuestions(data)
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error)
      setError('Ocorreu um erro ao carregar as perguntas. Por favor, tente novamente.')
    } finally {
      setLoading(false);
    }
  }

  // Função para carregar categorias
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      if (!response.ok) {
        throw new Error('Erro ao carregar as categorias')
      }
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      setError('Ocorreu um erro ao carregar as categorias. Por favor, tente novamente.')
    }
  }

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
          console.log('Buscando etapas para o teste:', selectedTestId);
          const response = await fetch(`/api/admin/tests/${selectedTestId}/stages`);
          if (!response.ok) {
            throw new Error('Erro ao carregar as etapas do teste');
          }
          const testStagesData = await response.json();
          console.log('Etapas recebidas:', testStagesData);
          
          // Criar objetos de etapa diretamente a partir dos dados retornados
          const mappedStages = testStagesData.map((ts: any) => ({
            id: ts.stageId,
            title: ts.stage_title || 'Etapa sem título',
            order: ts.order || 0,
            description: ts.stage_description || ''
          }));
          
          // Filtrar etapas inválidas
          const validStages = mappedStages.filter((stage: any) => stage.id);
          console.log('Etapas válidas:', validStages);
          setFilteredStages(validStages);
          
          // Buscar perguntas para todas as etapas do teste
          const questionsResponse = await fetch(`/api/admin/questions?testId=${selectedTestId}`);
          if (!questionsResponse.ok) {
            throw new Error('Erro ao carregar as perguntas do teste');
          }
          const questionsData = await questionsResponse.json();
          setQuestions(questionsData);
          
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
    if (filterType !== 'test' || selectedStageId === 'all' || !selectedTestId || selectedTestId === 'all') {
      return
    }

    const fetchQuestionsForStage = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/questions?testId=${selectedTestId}&stageId=${selectedStageId}`)
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
  }, [filterType, selectedStageId, selectedTestId])
  
  // Efeito para carregar perguntas quando a categoria selecionada mudar
  useEffect(() => {
    if (filterType !== 'category' || !selectedCategoryId) {
      return
    }
    
    fetchQuestions()
  }, [filterType, selectedCategoryId])

  const handleSubmit = async (values: any, formikHelpers: any) => {
    try {
      console.log('handleSubmit na página questions.tsx foi chamado com valores:', values);
      console.log('formikHelpers disponíveis:', formikHelpers);
      setError('');

      // Se estiver editando, prosseguir normalmente
      if (isEditing) {
        await saveQuestion(values, formikHelpers);
        return;
      }

      // Verificar se há teste e/ou etapa selecionados
      if (selectedTestId !== 'all') {
        const selectedTest = tests.find(test => test.id === selectedTestId);
        
        if (selectedTest) {
          // Guardar os valores do formulário
          setPendingFormValues({ 
            ...values, 
            formikHelpers: {
              resetForm: formikHelpers.resetForm
            }
          });
          setSelectedTestName(selectedTest.title);
          
          // Verificar se também há uma etapa selecionada
          if (selectedStageId !== 'all') {
            const selectedStage = filteredStages.find(stage => stage.id === selectedStageId);
            if (selectedStage) {
              setSelectedStageName(selectedStage.title);
              setAssociationMode('test-and-stage');
            } else {
              setAssociationMode('test');
            }
          } else {
            setAssociationMode('test');
          }
          
          setShowAssociateDialog(true);
          return;
        }
      }

      // Caso contrário, prosseguir normalmente
      await saveQuestion(values, formikHelpers);
    } catch (error) {
      console.error('Erro:', error);
      setError('Ocorreu um erro ao salvar a pergunta. Por favor, tente novamente.');
    }
  };

  // Função para salvar a pergunta após confirmação
  const saveQuestion = async (values: any, formikHelpers?: any) => {
    try {
      console.log('saveQuestion na página questions.tsx foi chamado com valores:', values);
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/admin/questions/${currentQuestion?.id}` : '/api/admin/questions';

      console.log('Enviando dados para o servidor:', values);
      console.log('Valores de categoria:', {
        categoryId: values.categoryId,
        categoryUuid: values.categoryUuid
      });

      // Garantir que stageId seja null se for uma string vazia
      // Usar categoryUuid para enviar o UUID da categoria
      const dataToSend = {
        ...values,
        stageId: values.stageId || null,
        categoryId: values.categoryId || null, // Enviar categoryId também para compatibilidade
        categoryUuid: values.categoryUuid || null,
      };

      console.log('Dados formatados para envio:', dataToSend);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        // Substituir o alert pelo novo sistema de notificações
        notify.showSuccess(isEditing ? 'Pergunta atualizada com sucesso!' : 'Pergunta criada com sucesso!');
        
        // Limpar o formulário e o estado de edição apenas se não estiver editando
        if (!isEditing && formikHelpers) {
          formikHelpers.resetForm();
        }
        
        // Ao editar, manter o estado de edição e a pergunta atual
        if (!isEditing) {
          setIsEditing(false);
          setCurrentQuestion(null);
        } else if (response.ok) {
          // Se a edição foi bem-sucedida, atualizar a pergunta atual com os novos dados
          const updatedQuestion = await response.json();
          console.log('Pergunta atualizada recebida do servidor:', updatedQuestion);
          setCurrentQuestion(updatedQuestion);
        }
        
        // Recarregar as perguntas
        fetchQuestions();
      } else {
        const errorData = await response.json();
        // Substituir o alert pelo novo sistema de notificações
        notify.showError(`Erro ao ${isEditing ? 'atualizar' : 'criar'} pergunta: ${errorData.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      // Substituir o alert pelo novo sistema de notificações
      notify.showError(`Erro ao ${isEditing ? 'atualizar' : 'criar'} pergunta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Função para associar a pergunta ao teste selecionado
  const handleAssociateWithTest = async () => {
    if (!pendingFormValues) return;
    
    try {
      // Buscar as etapas do teste selecionado
      const response = await fetch(`/api/admin/tests/${selectedTestId}/stages`);
      if (!response.ok) {
        throw new Error('Erro ao carregar as etapas do teste');
      }
      const testStages = await response.json();
      
      // Se o teste tiver etapas, usar a primeira etapa
      if (testStages && testStages.length > 0) {
        const firstStageId = testStages[0].stageId;
        const updatedValues = {
          ...pendingFormValues,
          stageId: firstStageId
        };
        
        await saveQuestion(updatedValues, pendingFormValues.formikHelpers);
      } else {
        // Se o teste não tiver etapas, salvar a pergunta normalmente
        await saveQuestion(pendingFormValues, pendingFormValues.formikHelpers);
      }
      
      // Fechar o diálogo
      setShowAssociateDialog(false);
      setPendingFormValues(null);
    } catch (error) {
      console.error('Erro ao associar pergunta ao teste:', error);
      setError('Ocorreu um erro ao associar a pergunta ao teste. Por favor, tente novamente.');
      setShowAssociateDialog(false);
    }
  };

  // Função para associar a pergunta ao teste e à etapa selecionados
  const handleAssociateWithTestAndStage = async () => {
    if (!pendingFormValues) return;
    
    try {
      const updatedValues = {
        ...pendingFormValues,
        stageId: selectedStageId
      };
      
      await saveQuestion(updatedValues, pendingFormValues.formikHelpers);
      
      // Fechar o diálogo
      setShowAssociateDialog(false);
      setPendingFormValues(null);
    } catch (error) {
      console.error('Erro ao associar pergunta ao teste e etapa:', error);
      setError('Ocorreu um erro ao associar a pergunta. Por favor, tente novamente.');
      setShowAssociateDialog(false);
    }
  };

  // Função para continuar sem associar ao teste
  const handleContinueWithoutAssociation = async () => {
    if (!pendingFormValues) return;
    
    await saveQuestion(pendingFormValues, pendingFormValues.formikHelpers);
    setShowAssociateDialog(false);
    setPendingFormValues(null);
  };

  // Função para buscar as perguntas
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      // Construir a URL com os parâmetros de filtro
      let url = '/api/admin/questions';
      const params = new URLSearchParams();
      
      if (filterType === 'test') {
        if (selectedTestId !== 'all') {
          params.append('testId', selectedTestId);
          
          if (selectedStageId !== 'all') {
            params.append('stageId', selectedStageId);
          }
        }
      } else if (filterType === 'category') {
        console.log('Filtrando por categoria:', selectedCategoryId);
        if (selectedCategoryId !== 'all') {
          params.append('categoryId', selectedCategoryId);
        } else {
          // Se "Todas as Categorias" estiver selecionado, não adicionar parâmetro
          // e buscar todas as perguntas
          console.log('Buscando todas as perguntas (todas as categorias)');
        }
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Buscando perguntas com URL:', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log(`Encontradas ${data.length} perguntas`);
        setQuestions(data);
      } else {
        notify.showError('Erro ao carregar perguntas');
      }
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
      notify.showError('Erro ao carregar perguntas');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = async (question: Question) => {
    try {
      // Buscar os detalhes completos da pergunta
      const response = await fetch(`/api/admin/questions/${question.id}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes da pergunta');
      }
      
      const questionDetails = await response.json();
      console.log('Detalhes da pergunta para edição:', questionDetails);
      
      // Garantir que categoryId esteja definido corretamente a partir do objeto category
      const completeQuestion = {
        ...questionDetails,
        // Explicitamente definir categoryId com base na categoria
        categoryId: questionDetails.category?.id || null,
        categoryUuid: questionDetails.category?.id || null
      };
      
      console.log('Pergunta processada para edição:', completeQuestion);
      console.log('Verificação específica de categoria:', {
        'category.id': questionDetails.category?.id,
        categoryId: completeQuestion.categoryId,
        categoryUuid: completeQuestion.categoryUuid
      });
      
      setCurrentQuestion(completeQuestion);
      setIsEditing(true);
    } catch (error) {
      console.error('Erro ao editar pergunta:', error);
      setError('Ocorreu um erro ao carregar os detalhes da pergunta para edição.');
    }
  };

  // Função para confirmar a exclusão de uma pergunta
  const confirmDeleteQuestion = (question: Question) => {
    // Substituir o confirm pelo novo sistema de notificações
    notify.confirm(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir a pergunta "${question.text}"?`,
      () => deleteQuestion(question.id),
      {
        type: 'warning',
        confirmText: 'Excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  // Função para excluir uma pergunta
  const deleteQuestion = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      });

      if (response.status === 204) {
        // Substituir o alert pelo novo sistema de notificações
        notify.showSuccess('Pergunta excluída com sucesso!');
        
        // Se a pergunta excluída for a atual, limpar o estado de edição
        if (currentQuestion?.id === id) {
          setIsEditing(false);
          setCurrentQuestion(null);
        }
        
        // Recarregar as perguntas
        fetchQuestions();
      } else if (response.status === 409) {
        // Pergunta está associada a um teste ou tem respostas
        const data = await response.json();
        
        let confirmMessage = 'Tem certeza que deseja continuar?';
        
        if (data.hasResponses && data.isAssociatedWithTest) {
          confirmMessage = 'Esta pergunta possui respostas de candidatos e está associada a um ou mais testes. Os dados das respostas estão seguros em snapshots, então você pode prosseguir com a exclusão. Tem certeza que deseja continuar?';
        } else if (data.hasResponses) {
          confirmMessage = 'Esta pergunta possui respostas de candidatos. Os dados das respostas estão seguros em snapshots, então você pode prosseguir com a exclusão. Tem certeza que deseja continuar?';
        } else if (data.isAssociatedWithTest) {
          confirmMessage = 'Esta pergunta está associada a um ou mais testes. Remover a pergunta irá desassociá-la de todos os testes. Tem certeza que deseja continuar?';
        }
        
        // Mostrar confirmação especial
        notify.confirm(
          'Atenção: Exclusão de pergunta',
          confirmMessage,
          async () => {
            // Se o usuário confirmar, fazer uma segunda requisição para forçar a exclusão
            const forceDeleteResponse = await fetch(`/api/admin/questions/${id}/force-delete`, {
              method: 'DELETE',
            });
            
            if (forceDeleteResponse.ok) {
              notify.showSuccess('Pergunta excluída com sucesso!');
              
              // Se a pergunta excluída for a atual, limpar o estado de edição
              if (currentQuestion?.id === id) {
                setIsEditing(false);
                setCurrentQuestion(null);
              }
              
              // Recarregar as perguntas
              fetchQuestions();
            } else {
              const errorData = await forceDeleteResponse.json();
              notify.showError(`Erro ao excluir pergunta: ${errorData.error || 'Erro desconhecido'}`);
            }
          },
          {
            type: 'warning',
            confirmText: 'Sim, excluir mesmo assim',
            cancelText: 'Cancelar'
          }
        );
      } else {
        const errorData = await response.json();
        // Substituir o alert pelo novo sistema de notificações
        notify.showError(`Erro ao excluir pergunta: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
      // Substituir o alert pelo novo sistema de notificações
      notify.showError(`Erro ao excluir pergunta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleCancel = () => {
    setIsEditing(false)
    setCurrentQuestion(null)
  }

  // Componente de carregamento para evitar piscadas de tela
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-800">Gerenciar Perguntas</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Pergunta */}
          <QuestionForm
            stages={filteredStages.length > 0 ? filteredStages : []}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={isEditing ? handleCancel : undefined}
            initialValues={
              isEditing && currentQuestion
                ? {
                    text: currentQuestion.text,
                    stageId: currentQuestion.stageId,
                    categoryUuid: currentQuestion.categoryUuid || '',
                    options: currentQuestion.options,
                  }
                : undefined
            }
            isEditing={isEditing}
            hideStageField={selectedTestId === 'all'}
            preSelectedStageId={selectedStageId !== 'all' ? selectedStageId : ''}
            isUpdating={isEditing} // Definir isUpdating como true quando estiver editando uma pergunta
          />

          {/* Lista de Perguntas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              Perguntas Cadastradas
            </h2>

            <div className="mb-4">
              <label htmlFor="filterType" className="block text-sm font-medium text-secondary-700 mb-1">
                Tipo de Filtro
              </label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => {
                  const newFilterType = e.target.value as 'test' | 'category';
                  setFilterType(newFilterType);
                  setSelectedTestId('all');
                  setSelectedStageId('all');
                  setSelectedCategoryId('all');
                  // Recarregar todas as perguntas quando mudar o tipo de filtro
                  loadQuestions();
                }}
                className="input-field"
              >
                <option value="test">Filtrar por Teste</option>
                <option value="category">Filtrar por Categoria</option>
              </select>
            </div>

            {filterType === 'test' && (
              <div className="mb-4">
                <label htmlFor="testFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                  Selecionar Teste
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
            )}

            {filterType === 'test' && selectedTestId !== 'all' && (
              <div className="mb-4">
                {filteredStages.length > 0 && (
                  <>
                    <label htmlFor="stageFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                      Selecionar Etapa
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

            {filterType === 'category' && (
              <div className="mb-4">
                <label htmlFor="categoryFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                  Selecionar Categoria
                </label>
                <select
                  id="categoryFilter"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const newCategoryId = e.target.value;
                    console.log('Categoria selecionada:', newCategoryId);
                    setSelectedCategoryId(newCategoryId);
                    // Não chamamos fetchQuestions() aqui, pois o useEffect cuidará disso
                  }}
                  className="input-field"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {questions.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                Nenhuma pergunta cadastrada
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-secondary-600">
                  {filterType === 'test' ? (
                    selectedTestId === 'all' && selectedStageId === 'all'
                      ? `Exibindo todas as ${questions.length} perguntas`
                      : selectedTestId !== 'all' && selectedStageId === 'all'
                      ? `Exibindo perguntas do teste "${tests.find((t) => t.id === selectedTestId)?.title || ''}"`
                      : `Exibindo perguntas da etapa "${filteredStages.find((s) => s.id === selectedStageId)?.title || ''}" do teste "${tests.find((t) => t.id === selectedTestId)?.title || ''}"`
                  ) : (
                    selectedCategoryId === 'all'
                      ? `Exibindo todas as ${questions.length} perguntas`
                      : `Exibindo perguntas da categoria "${categories.find((c) => c.id === selectedCategoryId)?.name || ''}"`
                  )}
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {questions
                    .filter((question) => {
                      // Não é necessário filtrar aqui, pois a filtragem já é feita na API
                      // Mantemos apenas para compatibilidade com o código existente
                      return true;
                    })
                    .map((question) => {
                      const stage = filteredStages.find((s) => s.id === question.stageId)
                      return (
                        <div key={question.id} className="border border-secondary-200 rounded-md p-4 hover:bg-secondary-50">
                          <div className="flex justify-between">
                            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                              {question.categoryName || 'Sem categoria'}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditQuestion(question)}
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
                                onClick={() => confirmDeleteQuestion(question)}
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
                            {question.options && question.options.length > 0 ? (
                              question.options.map((option, index) => (
                                <div key={option.id || index} className="flex items-center">
                                  <span
                                    className={`w-4 h-4 rounded-full mr-2 ${
                                      option.isCorrect ? 'bg-green-500' : 'bg-secondary-200'
                                    }`}
                                  ></span>
                                  <span className={option.isCorrect ? 'font-medium' : ''}>{option.text}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-secondary-500 italic">Sem opções</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Diálogo de confirmação para associar a pergunta ao teste */}
      <Dialog
        open={showAssociateDialog}
        onClose={() => setShowAssociateDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '8px',
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" style={{ color: '#4F46E5', fontWeight: 'bold' }}>
          Associar pergunta
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {associationMode === 'test-and-stage' ? (
              <>
                Você deseja associar esta pergunta ao teste <strong>{selectedTestName}</strong> e à etapa <strong>{selectedStageName}</strong> que estão selecionados no filtro?
              </>
            ) : (
              <>
                Você deseja associar esta pergunta ao teste <strong>{selectedTestName}</strong> que está selecionado no filtro?
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleContinueWithoutAssociation} 
            style={{ 
              color: '#6B7280', 
              fontWeight: 'medium',
              textTransform: 'none',
              borderRadius: '6px'
            }}
          >
            Não associar
          </Button>
          {associationMode === 'test-and-stage' && (
            <Button 
              onClick={handleAssociateWithTest} 
              style={{ 
                color: '#4F46E5', 
                fontWeight: 'medium',
                textTransform: 'none',
                borderRadius: '6px',
                border: '1px solid #4F46E5'
              }}
              variant="outlined"
            >
              Associar somente ao teste
            </Button>
          )}
          {associationMode === 'test' ? (
            <Button 
              onClick={handleAssociateWithTest} 
              style={{ 
                backgroundColor: '#4F46E5', 
                color: 'white',
                fontWeight: 'medium',
                textTransform: 'none',
                borderRadius: '6px',
                padding: '8px 16px'
              }} 
              variant="contained"
              autoFocus
            >
              Associar ao teste
            </Button>
          ) : (
            <Button 
              onClick={handleAssociateWithTestAndStage} 
              style={{ 
                backgroundColor: '#4F46E5', 
                color: 'white',
                fontWeight: 'medium',
                textTransform: 'none',
                borderRadius: '6px',
                padding: '8px 16px'
              }} 
              variant="contained"
              autoFocus
            >
              Associar ao teste e etapa
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AdminLayout>
  )
}

export default Questions
