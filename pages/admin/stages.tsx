import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

interface Stage {
  id: string
  title: string
  description: string
  order: number
  questionCount?: number
}

const validationSchema = Yup.object({
  title: Yup.string().required('Título é obrigatório'),
  description: Yup.string(),
  order: Yup.number()
    .required('Ordem é obrigatória')
    .min(1, 'A ordem deve ser pelo menos 1')
    .max(6, 'A ordem não pode ser maior que 6')
    .integer('A ordem deve ser um número inteiro'),
})

const Stages: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  
  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    // Carregar etapas
    const fetchStages = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/stages')
        
        if (!response.ok) {
          throw new Error('Erro ao carregar as etapas')
        }
        
        const data = await response.json()
        setStages(data)
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar as etapas. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchStages()
    }
  }, [status])
  
  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      const url = isEditing 
        ? `/api/admin/stages/${currentStage?.id}` 
        : '/api/admin/stages'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} a etapa`)
      }
      
      // Recarregar etapas
      const stagesResponse = await fetch('/api/admin/stages')
      const stagesData = await stagesResponse.json()
      setStages(stagesData)
      
      // Limpar formulário e estado
      resetForm()
      setIsEditing(false)
      setCurrentStage(null)
      
    } catch (error) {
      console.error('Erro:', error)
      setError(`Ocorreu um erro ao ${isEditing ? 'atualizar' : 'salvar'} a etapa. Por favor, tente novamente.`)
    }
  }
  
  const handleEdit = (stage: Stage) => {
    setCurrentStage(stage)
    setIsEditing(true)
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta etapa? Todas as perguntas associadas também serão excluídas.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/stages/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir a etapa')
      }
      
      // Atualizar a lista de etapas
      setStages(stages.filter(s => s.id !== id))
      
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao excluir a etapa. Por favor, tente novamente.')
    }
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setCurrentStage(null)
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
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/admin/dashboard" className="text-xl font-bold text-primary-700">
                <Image 
                  src="/images/logo_horizontal.png"
                  alt="AvaliaRH Logo"
                  width={150}
                  height={45}
                  priority
                />
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link href="/admin/dashboard" className="px-3 py-2 text-secondary-700 hover:text-primary-600 font-medium">
                  Dashboard
                </Link>
                <Link href="/admin/questions" className="px-3 py-2 text-secondary-700 hover:text-primary-600 font-medium">
                  Perguntas
                </Link>
                <Link href="/admin/stages" className="px-3 py-2 text-primary-600 border-b-2 border-primary-600 font-medium">
                  Etapas
                </Link>
              </div>
            </div>
            <div className="text-secondary-700">
              <Link href="/admin/profile" className="text-secondary-700 hover:text-primary-600">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {session?.user?.email}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciar Etapas</h1>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Etapa */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              {isEditing ? 'Editar Etapa' : 'Nova Etapa'}
            </h2>
            
            <Formik
              initialValues={
                isEditing && currentStage
                  ? {
                      title: currentStage.title,
                      description: currentStage.description || '',
                      order: currentStage.order,
                    }
                  : {
                      title: '',
                      description: '',
                      order: stages.length + 1,
                    }
              }
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting }) => (
                <Form className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-secondary-700 mb-1">
                      Título da Etapa
                    </label>
                    <Field
                      type="text"
                      name="title"
                      id="title"
                      className="input-field"
                      placeholder="Ex: Conhecimentos Técnicos"
                    />
                    <ErrorMessage name="title" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                      Descrição (opcional)
                    </label>
                    <Field
                      as="textarea"
                      name="description"
                      id="description"
                      rows={3}
                      className="input-field"
                      placeholder="Uma breve descrição sobre esta etapa"
                    />
                    <ErrorMessage name="description" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div>
                    <label htmlFor="order" className="block text-sm font-medium text-secondary-700 mb-1">
                      Ordem (1-6)
                    </label>
                    <Field
                      type="number"
                      name="order"
                      id="order"
                      min="1"
                      max="6"
                      className="input-field"
                    />
                    <ErrorMessage name="order" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting 
                        ? 'Salvando...' 
                        : isEditing 
                          ? 'Atualizar Etapa' 
                          : 'Adicionar Etapa'
                      }
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
          
          {/* Lista de Etapas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">
              Etapas Cadastradas
            </h2>
            
            {stages.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                Nenhuma etapa cadastrada
              </div>
            ) : (
              <div className="space-y-4">
                {stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <div key={stage.id} className="border border-secondary-200 rounded-md p-4 hover:bg-secondary-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <span className="bg-primary-100 text-primary-800 w-8 h-8 rounded-full flex items-center justify-center font-medium mr-3">
                              {stage.order}
                            </span>
                            <h3 className="text-lg font-medium text-secondary-800">{stage.title}</h3>
                          </div>
                          
                          {stage.description && (
                            <p className="text-secondary-600 mt-2 ml-11">{stage.description}</p>
                          )}
                          
                          <div className="mt-2 ml-11">
                            <span className="text-xs font-medium text-secondary-500">
                              {stage.questionCount !== undefined 
                                ? `${stage.questionCount} pergunta${stage.questionCount !== 1 ? 's' : ''}` 
                                : 'Carregando...'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(stage)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(stage.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
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
      </main>
    </div>
  )
}

export default Stages
