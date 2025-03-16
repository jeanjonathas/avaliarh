import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import SuperAdminLayout from '../../components/SuperAdminLayout'
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

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

const GlobalCategories: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const notify = useNotificationSystem();
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/superadmin/categories')
        if (!response.ok) {
          throw new Error('Erro ao carregar as categorias')
        }
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Erro:', error)
        setError('Falha ao carregar as categorias')
      } finally {
        setLoading(false)
      }
    }
    
    if (session) {
      fetchCategories()
    }
  }, [session])
  
  const handleAddCategory = async (values: any, { resetForm }: any) => {
    try {
      const response = await fetch('/api/superadmin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar categoria')
      }
      
      const newCategory = await response.json()
      setCategories([...categories, newCategory])
      resetForm()
      notify.showSuccess('Categoria adicionada com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao adicionar categoria')
    }
  }
  
  const handleUpdateCategory = async (values: any, { resetForm }: any) => {
    try {
      const response = await fetch(`/api/superadmin/categories/${currentCategory?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar categoria')
      }
      
      const updatedCategory = await response.json()
      setCategories(
        categories.map((cat) =>
          cat.id === updatedCategory.id ? updatedCategory : cat
        )
      )
      
      setIsEditing(false)
      setCurrentCategory(null)
      resetForm()
      notify.showSuccess('Categoria atualizada com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao atualizar categoria')
    }
  }
  
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/superadmin/categories/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir categoria')
      }
      
      setCategories(categories.filter((cat) => cat.id !== id))
      notify.showSuccess('Categoria excluída com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao excluir categoria')
    }
  }
  
  const handleEditCategory = (category: Category) => {
    setCurrentCategory(category)
    setIsEditing(true)
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentCategory(null)
  }
  
  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Categorias Globais</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
              </h2>
              
              <Formik
                initialValues={
                  isEditing && currentCategory
                    ? {
                        name: currentCategory.name,
                        description: currentCategory.description || '',
                      }
                    : {
                        name: '',
                        description: '',
                      }
                }
                validationSchema={validationSchema}
                onSubmit={isEditing ? handleUpdateCategory : handleAddCategory}
                enableReinitialize
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome
                      </label>
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        id="description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {isEditing ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Categorias Existentes</h2>
              
              {loading ? (
                <p className="text-center py-4">Carregando categorias...</p>
              ) : error ? (
                <p className="text-center text-red-600 py-4">{error}</p>
              ) : categories.length === 0 ? (
                <p className="text-center py-4">Nenhuma categoria encontrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Questões
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{category.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{category.questionsCount || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}

export default GlobalCategories
