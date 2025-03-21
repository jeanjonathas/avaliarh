import type { NextPage } from 'next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import AdminLayout from '../../components/admin/AdminLayout'
import { CandidatesTable } from '../../components/candidates'
import { Candidate } from '../../components/candidates/types'

const CandidatesPage: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/admin/candidates', {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar candidatos: ${response.status}`)
        }
        
        const data = await response.json()
        setCandidates(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Erro ao carregar candidatos:', error)
        setError('Não foi possível carregar a lista de candidatos. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchCandidates()
    }
  }, [session])

  // Função para lidar com a adição de um novo candidato
  const handleAddCandidate = () => {
    router.push('/admin/candidates/new')
  }
  
  // Função para tentar novamente em caso de erro
  const handleRetry = () => {
    if (session) {
      setError(null)
      setLoading(true)
      // Recarregar a página para tentar novamente
      window.location.reload()
    }
  }

  // Renderizar estado de carregamento
  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-secondary-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-700">Carregando candidatos...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-secondary-50">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Erro</h3>
            <p className="text-secondary-600 mb-4">{error}</p>
            <button 
              onClick={handleRetry} 
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 bg-secondary-50 min-h-screen">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Gerenciar Candidatos</h1>
            <p className="text-secondary-600">Visualize, adicione e gerencie candidatos no sistema</p>
          </div>
          <button 
            onClick={handleAddCandidate}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Adicionar Candidato
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-secondary-900">Nenhum candidato encontrado</h3>
              <p className="mt-2 text-secondary-600">Adicione candidatos para começar a gerenciar o processo seletivo.</p>
              <button 
                onClick={handleAddCandidate} 
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Adicionar Candidato
              </button>
            </div>
          ) : (
            <CandidatesTable
              initialCandidates={candidates}
              showAddButton={false} // Já temos um botão de adicionar no cabeçalho
              showDeleteButton={true}
              showRatingFilter={true}
              showScoreFilter={true}
              showStatusFilter={true}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default CandidatesPage
