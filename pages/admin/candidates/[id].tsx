import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Tab } from '@headlessui/react'
import { Candidate } from '../../../components/candidates/types'
import { CandidateInfoTab } from '../../../components/candidates/tabs/CandidateInfoTab'
import { CandidateAnswersTab } from '../../../components/candidates/tabs/CandidateAnswersTab'
import { CandidateResultsTab } from '../../../components/candidates/tabs/CandidateResultsTab'
import { CandidateObservationsTab } from '../../../components/candidates/tabs/CandidateObservationsTab'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function CandidateDetails() {
  const router = useRouter()
  const { id } = router.query
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
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <p className="text-gray-500">Carregando dados do candidato...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <p className="text-red-500">{error || 'Candidato não encontrado'}</p>
            <button
              onClick={() => router.push('/admin/candidates')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Voltar para lista de candidatos
            </button>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { name: 'Informações', Component: CandidateInfoTab },
    { name: 'Respostas', Component: CandidateAnswersTab },
    { name: 'Resultados', Component: CandidateResultsTab },
    { name: 'Observações', Component: CandidateObservationsTab },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
                <button
                  onClick={() => router.push('/admin/candidates')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Voltar
                </button>
              </div>

              <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.name}
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                          'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                          selected
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                        )
                      }
                    >
                      {tab.name}
                    </Tab>
                  ))}
                </Tab.List>
                <Tab.Panels className="mt-4">
                  {tabs.map((tab, index) => {
                    const TabComponent = tab.Component
                    return (
                      <Tab.Panel
                        key={tab.name}
                        className={classNames(
                          'rounded-xl bg-white p-3',
                          'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                        )}
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
      </div>
    </div>
  )
}
