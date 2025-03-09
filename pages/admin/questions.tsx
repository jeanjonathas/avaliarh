import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Navbar from '../../components/admin/Navbar'
import QuestionForm from '../../components/admin/QuestionForm'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

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
      setTests(data)
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
      console.log('Carregando perguntas...');
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
          const response = await fetch(`/api/admin/tests/${selectedTestId}/stages`);
          if (!response.ok) {
            throw new Error('Erro ao carregar as etapas do teste');
          }
          const testStagesData = await response.json();
          
          if (testStagesData.length === 0) {
            // Se o teste não tiver etapas, definir a lista como vazia
            setFilteredStages([]);

            // Também buscar perguntas do teste selecionado sem filtrar por etapa
            const questionsResponse = await fetch(`/api/admin/questions?testId=${selectedTestId}`);
            if (!questionsResponse.ok) {
              throw new Error('Erro ao carregar as perguntas do teste');
            }
            const questionsData = await questionsResponse.json();
            setQuestions(questionsData);
          } else {
            // Criar objetos de etapa diretamente a partir dos dados retornados
            const mappedStages = testStagesData.map((ts: any) => ({
              id: ts.stageId,
              title: ts.stage_title || 'Etapa sem título',
              order: ts.order || 0,
              description: ts.stage_description || ''
            }));
            
            // Filtrar etapas inválidas
            const validStages = mappedStages.filter((stage: any) => stage.id);
            setFilteredStages(validStages);
            
            // Buscar perguntas para todas as etapas do teste
            const questionsResponse = await fetch(`/api/admin/questions?testId=${selectedTestId}`);
            if (!questionsResponse.ok) {
              throw new Error('Erro ao carregar as perguntas do teste');
            }
            const questionsData = await questionsResponse.json();
            setQuestions(questionsData);
          }
          
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
    if (selectedStageId === 'all' || !selectedTestId || selectedTestId === 'all') {
      return
    }

    const fetchQuestionsForStage = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/questions?stageId=${selectedStageId}`)
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
  }, [selectedStageId, selectedTestId])

  const handleSubmit = async (values: any, formikHelpers: any) => {
    try {
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
        categoryUuid: values.categoryUuid || null,
        categoryId: undefined // Não enviar categoryId para evitar conflitos
      };

      console.log('Dados formatados para envio:', dataToSend);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro do servidor:', errorData);
        if (errorData.error === 'UUID de categoria inválido') {
          // Erro específico de UUID inválido
          setError('UUID de categoria inválido. Por favor, selecione a categoria novamente.');
        } else {
          throw new Error(errorData.error || 'Erro ao salvar a pergunta');
        }
      }

      // Atualizar a lista de perguntas
      const questionsResponse = await fetch('/api/admin/questions');
      const questionsData = await questionsResponse.json();
      setQuestions(questionsData);

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
        setCurrentQuestion(updatedQuestion);
      }

      // Exibir mensagem de sucesso
      setSuccessMessage(isEditing ? 'Pergunta atualizada com sucesso!' : 'Pergunta criada com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro:', error);
      setError('Ocorreu um erro ao salvar a pergunta. Por favor, tente novamente.');
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

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir a pergunta')
      }

      // Atualizar a lista de perguntas
      setQuestions(questions.filter((q) => q.id !== id))
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao excluir a pergunta. Por favor, tente novamente.')
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setCurrentQuestion(null)
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

  return (
    <div className="min-h-screen bg-secondary-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciar Perguntas</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
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
              <label htmlFor="testFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                Filtrar por Teste
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

            {selectedTestId !== 'all' && (
              <div className="mb-4">
                {filteredStages.length > 0 && (
                  <>
                    <label htmlFor="stageFilter" className="block text-sm font-medium text-secondary-700 mb-1">
                      Filtrar por Etapa
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

            {questions.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                Nenhuma pergunta cadastrada
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-secondary-600">
                  {selectedTestId === 'all' && selectedStageId === 'all'
                    ? `Exibindo todas as ${questions.length} perguntas`
                    : selectedTestId !== 'all' && selectedStageId === 'all' && filteredStages.length > 0
                    ? `Exibindo perguntas do teste "${tests.find((t) => t.id === selectedTestId)?.title || ''}"`
                    : selectedTestId !== 'all' && selectedStageId === 'all' && filteredStages.length === 0
                    ? `O teste "${tests.find((t) => t.id === selectedTestId)?.title || ''}" não possui etapas cadastradas. Por favor, cadastre etapas para este teste antes de criar perguntas.`
                    : `Exibindo perguntas da etapa "${filteredStages.find((s) => s.id === selectedStageId)?.title || ''}"`}
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {questions
                    .filter((question) => {
                      // Se nenhum filtro estiver ativo, mostrar todas as perguntas
                      if (selectedTestId === 'all' && selectedStageId === 'all') {
                        return true
                      }

                      // Se apenas o filtro de teste estiver ativo
                      if (selectedTestId !== 'all' && selectedStageId === 'all') {
                        // Verificar se a etapa da pergunta pertence ao teste selecionado
                        const stageIds = filteredStages.map((stage) => stage.id)
                        // Se não houver etapas no teste, não mostrar nenhuma pergunta
                        if (stageIds.length === 0) {
                          return false
                        }
                        return stageIds.includes(question.stageId)
                      }

                      // Se o filtro de etapa estiver ativo
                      return question.stageId === selectedStageId
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
                                onClick={() => handleDelete(question.id)}
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
                          <div className="text-sm text-secondary-600 mb-2">
                            <span className="font-medium">Etapa:</span> {stage ? stage.title : 'Sem etapa'}
                          </div>
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
      </main>

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
    </div>
  )
}

export default Questions
