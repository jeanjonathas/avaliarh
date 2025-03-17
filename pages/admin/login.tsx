import { NextPage } from 'next'
import { useState } from 'react'
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
  
  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
      })
      
      if (result?.error) {
        setError('Email ou senha inválidos')
      } else {
        // Obter a sessão para verificar o papel do usuário
        const session = await getSession()
        
        // Redirecionar com base no papel do usuário
        if (session?.user.role === 'SUPER_ADMIN') {
          router.push('/superadmin/dashboard')
        } else {
          router.push('/admin/dashboard')
        }
      }
    } catch (error) {
      console.error('Erro de login:', error)
      setError('Ocorreu um erro ao fazer login. Tente novamente.')
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <Image 
              src="/images/logo_horizontal.png"
              alt="AvaliaRH Logo"
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
                  />
                  <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary"
                  >
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
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
