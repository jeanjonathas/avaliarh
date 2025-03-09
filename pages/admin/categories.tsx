import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import Navbar from '../../components/admin/Navbar'

interface Category {
  id: string
  name: string
  description: string | null
  questionsCount?: number
}

const validationSchema = Yup.object({
  name: Yup.string().required('O nome da categoria é obrigatório'),
  description: Yup.string(),
})

const Categories: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/categories')
        if (!response.ok) {
          throw new Error('Erro ao carregar as categorias')
        }
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar as categorias. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchCategories()
    }
  }, [status])
  
  const handleSubmit = async (values: any, { resetForm }: any) => {
    try {
      const url = isEditing 
        ? `/api/admin/categories/${currentCategory?.id}` 
        : '/api/admin/categories'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} a categoria`)
      }
      
      // Recarregar categorias
      const categoriesResponse = await fetch('/api/admin/categories')
      const categoriesData = await categoriesResponse.json()
      setCategories(categoriesData)
      
      // Limpar formulário e estado
      resetForm()
      setIsEditing(false)
      setCurrentCategory(null)
      
    } catch (error) {
      console.error('Erro:', error)
      setError(`Ocorreu um erro ao ${isEditing ? 'atualizar' : 'salvar'} a categoria. Por favor, tente novamente.`)
    }
  }
  
  const handleEdit = (category: Category) => {
    setCurrentCategory(category)
    setIsEditing(true)
  }
  
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Esta operação não poderá ser desfeita.')) {
      return
    }
    
    try {
      console.log(`Tentando excluir categoria com ID: ${id}`)
      
      // Verificar se o ID é válido
      if (!id || id.trim() === '') {
        setError('ID da categoria inválido')
        return
      }
      
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      })
      
      let data
      try {
        data = await response.json()
      } catch (e) {
        console.error('Erro ao processar resposta JSON:', e)
        data = { error: 'Erro ao processar resposta' }
      }
      
      if (!response.ok) {
        console.error('Erro na resposta:', data)
        throw new Error(data.error || 'Erro ao excluir a categoria')
      }
      
      console.log('Resposta da exclusão:', data)
      
      // Atualizar a lista de categorias
      setCategories(categories.filter(c => c.id !== id))
      
      // Mostrar mensagem de sucesso
      setSuccessMessage('Categoria excluída com sucesso')
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (error) {
      console.error('Erro:', error)
      setError('Ocorreu um erro ao excluir a categoria. Por favor, tente novamente.')
      setTimeout(() => setError(''), 5000)
    }
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setCurrentCategory(null)
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

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-800">Gerenciar Categorias</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold text-secondary-800 mb-4">
                {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              
              <Formik
                initialValues={{
                  name: currentCategory?.name || '',
                  description: currentCategory?.description || '',
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome
                      </label>
                      <Field
                        id="name"
                        name="name"
                        type="text"
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage
                        name="name"
                        component="div"
                        className="mt-1 text-sm text-red-600"
                      />
                    </div>

                    <div className="mb-4">
                      <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                        Descrição
                      </label>
                      <Field
                        as="textarea"
                        id="description"
                        name="description"
                        rows={3}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage
                        name="description"
                        component="div"
                        className="mt-1 text-sm text-red-600"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Perguntas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-secondary-500">
                        Nenhuma categoria encontrada.
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-secondary-900">{category.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-secondary-600 max-w-md truncate">
                            {category.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-secondary-900">{category.questionsCount || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Categories
