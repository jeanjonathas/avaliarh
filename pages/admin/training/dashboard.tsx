import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'

const TrainingDashboard: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  if (status === 'loading') {
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
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Módulo de Treinamento em Desenvolvimento
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Estamos trabalhando para trazer uma experiência completa de treinamento para a plataforma AvaliaRH.
            Em breve você poderá gerenciar cursos, módulos e acompanhar o progresso dos alunos.
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
                Criação e gerenciamento de cursos
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Organização de módulos e lições
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Acompanhamento do progresso dos alunos
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Relatórios e análises de desempenho
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Integração com o módulo de seleção
              </li>
            </ul>
          </div>
          
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 font-medium"
          >
            Voltar para o Dashboard
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

export default TrainingDashboard
