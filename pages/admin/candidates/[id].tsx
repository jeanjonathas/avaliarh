import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Tab } from '@headlessui/react'
import { Candidate } from '../../../components/candidates/types'
import { CandidateInfoTab } from '../../../components/candidates/tabs/CandidateInfoTab'
import { CandidateAnswersTab } from '../../../components/candidates/tabs/CandidateAnswersTab'
import { CandidateResultsTab } from '../../../components/candidates/tabs/CandidateResultsTab'
import { CandidateObservationsTab } from '../../../components/candidates/tabs/CandidateObservationsTab'
import AdminLayout from '../../../components/admin/AdminLayout'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function CandidateDetails() {
  const router = useRouter()
  const { id, returnTo } = router.query
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!id) return

      try {
        const response = await fetch(`/api/admin/candidates/${id}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar dados do candidato')
        }

        const data = await response.json()
        setCandidate(data)
      } catch (error) {
        console.error('Erro ao carregar candidato:', error)
        setError('Erro ao carregar dados do candidato')
      } finally {
        setLoading(false)
      }
    }

    fetchCandidate()
  }, [id])

  const handleUpdate = () => {
    // Recarrega os dados do candidato após uma atualização
    if (id) {
      setLoading(true)
      fetch(`/api/admin/candidates/${id}`, {
        credentials: 'include'
      })
        .then(response => response.json())
        .then(data => setCandidate(data))
        .catch(error => console.error('Erro ao atualizar dados:', error))
        .finally(() => setLoading(false))
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
            <p className="text-secondary-700">Carregando dados do candidato...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !candidate) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error || 'Candidato não encontrado'}</p>
            </div>
            <button
              onClick={() => router.push('/admin/candidates')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Voltar para lista de candidatos
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const tabs = [
    { name: 'Informações', Component: CandidateInfoTab, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { name: 'Respostas', Component: CandidateAnswersTab, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )},
    { name: 'Resultados', Component: CandidateResultsTab, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { name: 'Observações', Component: CandidateObservationsTab, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )},
  ]

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-5">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-secondary-900">{candidate.name}</h1>
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                  candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {candidate.status === 'APPROVED' ? 'Aprovado' :
                   candidate.status === 'REJECTED' ? 'Rejeitado' :
                   'Pendente'}
                </span>
              </div>
              <div className="flex space-x-3">
                {returnTo && (
                  <button
                    onClick={() => router.push(returnTo as string)}
                    className="px-4 py-2 border border-secondary-300 rounded-md text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Voltar para o processo
                  </button>
                )}
                <button
                  onClick={() => router.push('/admin/candidates')}
                  className="px-4 py-2 border border-secondary-300 rounded-md text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Voltar para lista
                </button>
              </div>
            </div>

            <Tab.Group>
              <Tab.List className="flex border-b border-secondary-200">
                {tabs.map((tab) => (
                  <Tab
                    key={tab.name}
                    className={({ selected }) =>
                      classNames(
                        'flex items-center px-6 py-3 text-sm font-medium outline-none',
                        'border-b-2 -mb-px transition-colors duration-200',
                        selected
                          ? 'border-primary-600 text-primary-700'
                          : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                      )
                    }
                  >
                    {tab.icon}
                    {tab.name}
                  </Tab>
                ))}
              </Tab.List>
              <Tab.Panels className="mt-6">
                {tabs.map((tab, index) => {
                  const TabComponent = tab.Component
                  return (
                    <Tab.Panel
                      key={tab.name}
                      className="focus:outline-none"
                    >
                      {index === 3 ? (
                        <TabComponent candidate={candidate} onUpdate={handleUpdate} />
                      ) : (
                        <TabComponent candidate={candidate} />
                      )}
                    </Tab.Panel>
                  )
                })}
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
