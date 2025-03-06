import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

interface AdminProfile {
  id: string
  name: string
  email: string
  company: string
  position: string
  phone: string
}

const validationSchema = Yup.object({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string().email('Email inválido').required('Email é obrigatório'),
  company: Yup.string().required('Empresa é obrigatória'),
  position: Yup.string(),
  phone: Yup.string(),
  currentPassword: Yup.string().when('newPassword', {
    is: (val: string) => val && val.length > 0,
    then: (schema) => schema.required('Senha atual é obrigatória para alterar a senha'),
    otherwise: (schema) => schema,
  }),
  newPassword: Yup.string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'As senhas devem ser iguais')
    .when('newPassword', {
      is: (val: string) => val && val.length > 0,
      then: (schema) => schema.required('Confirmação de senha é obrigatória'),
      otherwise: (schema) => schema,
    }),
})

const AdminProfile: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    // Carregar dados do perfil
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/profile')
        
        if (!response.ok) {
          throw new Error('Erro ao carregar dados do perfil')
        }
        
        const data = await response.json()
        setProfile(data)
      } catch (error) {
        console.error('Erro:', error)
        setError('Não foi possível carregar seus dados. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status])
  
  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      setError('')
      setSuccess('')
      
      const payload = {
        name: values.name,
        email: values.email,
        company: values.company,
        position: values.position,
        phone: values.phone,
      }
      
      // Se a senha foi fornecida, adicionar ao payload
      if (values.newPassword) {
        payload['currentPassword'] = values.currentPassword
        payload['newPassword'] = values.newPassword
      }
      
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar perfil')
      }
      
      // Limpar campos de senha
      resetForm({
        values: {
          ...values,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
      })
      
      setSuccess('Perfil atualizado com sucesso!')
      
      // Atualizar dados do perfil
      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      
    } catch (error) {
      console.error('Erro:', error)
      setError(error.message || 'Ocorreu um erro ao atualizar seu perfil. Por favor, tente novamente.')
    } finally {
      setSubmitting(false)
    }
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
                <Link href="/admin/stages" className="px-3 py-2 text-secondary-700 hover:text-primary-600 font-medium">
                  Etapas
                </Link>
              </div>
            </div>
            <div className="text-secondary-700">
              {session?.user?.email}
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Meu Perfil</h1>
          <Link href="/admin/dashboard" className="btn-secondary">
            Voltar para Dashboard
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
            {success}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-secondary-800 mb-6">Editar Informações</h2>
          
          {profile && (
            <Formik
              initialValues={{
                name: profile.name || '',
                email: profile.email || '',
                company: profile.company || '',
                position: profile.position || '',
                phone: profile.phone || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome Completo
                      </label>
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                      />
                      <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                        Email
                      </label>
                      <Field
                        type="email"
                        name="email"
                        id="email"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                      />
                      <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-secondary-700 mb-1">
                        Empresa
                      </label>
                      <Field
                        type="text"
                        name="company"
                        id="company"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                      />
                      <ErrorMessage name="company" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-secondary-700 mb-1">
                        Cargo
                      </label>
                      <Field
                        type="text"
                        name="position"
                        id="position"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                      />
                      <ErrorMessage name="position" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                        Telefone
                      </label>
                      <Field
                        type="text"
                        name="phone"
                        id="phone"
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                      />
                      <ErrorMessage name="phone" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>
                  
                  <div className="border-t border-secondary-200 pt-6 mt-6">
                    <h3 className="text-lg font-medium text-secondary-800 mb-4">Alterar Senha</h3>
                    <p className="text-sm text-secondary-500 mb-4">
                      Deixe os campos em branco se não deseja alterar sua senha.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                          Senha Atual
                        </label>
                        <Field
                          type="password"
                          name="currentPassword"
                          id="currentPassword"
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                        />
                        <ErrorMessage name="currentPassword" component="div" className="mt-1 text-sm text-red-600" />
                      </div>
                      
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                            Nova Senha
                          </label>
                          <Field
                            type="password"
                            name="newPassword"
                            id="newPassword"
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                          />
                          <ErrorMessage name="newPassword" component="div" className="mt-1 text-sm text-red-600" />
                        </div>
                        
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                            Confirmar Nova Senha
                          </label>
                          <Field
                            type="password"
                            name="confirmPassword"
                            id="confirmPassword"
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
                          />
                          <ErrorMessage name="confirmPassword" component="div" className="mt-1 text-sm text-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminProfile
