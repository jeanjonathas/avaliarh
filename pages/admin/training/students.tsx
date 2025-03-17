import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import AdminLayout from '../../../components/admin/AdminLayout'

const TrainingStudents: NextPage = () => {
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Gerenciamento de Alunos em Desenvolvimento
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Estamos trabalhando para trazer funcionalidades completas de gerenciamento de alunos para o módulo de treinamento.
            Em breve você poderá cadastrar alunos, acompanhar seu progresso e gerenciar suas inscrições em cursos.
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
                Cadastro e gerenciamento de alunos
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Inscrição de alunos em cursos
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Acompanhamento de progresso individual
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Relatórios de desempenho
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Integração com candidatos aprovados
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

export default TrainingStudents
