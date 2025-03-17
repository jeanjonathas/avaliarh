import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'

const TrainingModules: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
    
    // Simulando carregamento de dados
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [status, router])
  
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
      <div className="container mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md max-w-3xl mx-auto">
            {error}
          </div>
        )}
        
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-24 w-24 mx-auto text-primary-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" 
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Gerenciamento de Módulos em Desenvolvimento
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Estamos trabalhando para trazer funcionalidades completas de gerenciamento de módulos para o sistema de treinamento.
            Em breve você poderá criar e organizar módulos, lições e materiais didáticos.
          </p>
          
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-primary-800 mb-3">
              Recursos que estão por vir:
            </h2>
            
            <ul className="text-left text-gray-700 space-y-2 max-w-md mx-auto">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Criação e edição de módulos de aprendizagem
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Organização de lições e conteúdos
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sequenciamento de conteúdo educacional
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Definição de pré-requisitos e dependências
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Integração com avaliações e exercícios
              </li>
            </ul>
          </div>
          
          <button
            onClick={() => router.push('/admin/training/dashboard')}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
          >
            Voltar para o Dashboard de Treinamento
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

export default TrainingModules
