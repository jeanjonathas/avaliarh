import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { signIn, getSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: Yup.string()
    .required('Senha é obrigatória'),
})

const Login: NextPage = () => {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Verificar se o usuário já está autenticado
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        console.log('Usuário já autenticado, redirecionando...')
        if (session.user.role === 'SUPER_ADMIN') {
          router.replace('/superadmin/dashboard')
        } else {
          router.replace('/admin/dashboard')
        }
      }
    }
    
    checkSession()
  }, [router])
  
  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      setIsLoading(true)
      setError('')
      
      console.log('Iniciando login para:', values.email)
      
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
      })
      
      if (result?.error) {
        console.error('Erro no login:', result.error)
        setError('Email ou senha inválidos')
        setIsLoading(false)
      } else {
        console.log('Login bem-sucedido, obtendo sessão...')
        // Obter a sessão para verificar o papel do usuário
        const session = await getSession()
        
        if (!session) {
          console.error('Sessão não encontrada após login')
          setError('Erro ao obter sessão. Tente novamente.')
          setIsLoading(false)
          return
        }
        
        console.log('Sessão obtida, papel:', session.user.role)
        
        // Redirecionar com base no papel do usuário
        if (session.user.role === 'SUPER_ADMIN') {
          console.log('Redirecionando para dashboard de superadmin')
          router.push('/superadmin/dashboard')
        } else {
          console.log('Redirecionando para dashboard de admin')
          router.push('/admin/dashboard')
        }
      }
    } catch (error) {
      console.error('Erro inesperado no login:', error)
      setError('Ocorreu um erro ao fazer login. Tente novamente.')
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <Image 
              src="/images/logo_horizontal.png"
              alt="Admitto Logo"
              width={200}
              height={60}
              priority
              className="mx-auto"
            />
            <h1 className="text-2xl font-bold text-secondary-900 mt-4">Área do Administrador</h1>
            <p className="text-secondary-600 mt-2">Faça login para acessar o painel administrativo</p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}
          
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                    Email
                  </label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    className="input-field"
                    placeholder="admin@empresa.com"
                    disabled={isLoading}
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
                    Senha
                  </label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    className="input-field"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div>
                  <button
                    type="submit"
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
                    disabled={isSubmitting || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  )
}

export default Login
