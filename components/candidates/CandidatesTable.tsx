import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Rating } from '@mui/material'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Candidate, Test, CandidatesTableProps, CandidateScore } from './types'
import AddCandidateModal from './modals/AddCandidateModal'
import DeleteCandidateModal from './modals/DeleteCandidateModal'
import InviteModal from './modals/InviteModal'
import SuccessModal from './modals/SuccessModal'
import { CandidateDetails } from './CandidateDetails'
import toast from 'react-hot-toast'

export const CandidatesTable = ({
  onCandidateAdded,
  onCandidateDeleted,
  onCandidateUpdated,
  showAddButton = true,
  showDeleteButton = true,
  showRatingFilter = true,
  showScoreFilter = true,
  showStatusFilter = true,
  initialStatusFilter = 'ALL',
  initialRatingFilter = 'ALL',
  initialScoreFilter = 'ALL',
  initialSearchTerm = '',
}: CandidatesTableProps) => {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter)
  const [ratingFilter, setRatingFilter] = useState(initialRatingFilter)
  const [scoreFilter, setScoreFilter] = useState(initialScoreFilter)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Carregar candidatos
  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/candidates', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`Erro ao carregar candidatos: ${response.status}`)
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setCandidates(data)
      } else {
        console.error('Dados de candidatos não são um array:', data)
        setCandidates([])
      }
    } catch (error) {
      setError('Erro ao carregar candidatos')
      console.error('Erro ao carregar candidatos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para obter a porcentagem do score
  const getScorePercentage = (score: number | CandidateScore | undefined): number => {
    if (!score) return 0
    if (typeof score === 'number') return score
    return score.percentage
  }

  // Filtrar candidatos
  const filteredCandidates = candidates.filter(candidate => {
    const searchMatch = searchTerm === '' || 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.position && candidate.position.toLowerCase().includes(searchTerm.toLowerCase()))

    const statusMatch = !showStatusFilter || statusFilter === 'ALL' || candidate.status === statusFilter

    let ratingMatch = true
    if (showRatingFilter && ratingFilter !== 'ALL') {
      if (ratingFilter === 'RATED') {
        ratingMatch = candidate.rating !== null && candidate.rating > 0
      } else if (ratingFilter === 'UNRATED') {
        ratingMatch = candidate.rating === null || candidate.rating === 0
      } else if (ratingFilter === 'HIGH') {
        ratingMatch = candidate.rating !== null && candidate.rating >= 4
      } else if (ratingFilter === 'MEDIUM') {
        ratingMatch = candidate.rating !== null && candidate.rating >= 2.5 && candidate.rating < 4
      } else if (ratingFilter === 'LOW') {
        ratingMatch = candidate.rating !== null && candidate.rating > 0 && candidate.rating < 2.5
      }
    }

    let scoreMatch = true
    if (showScoreFilter && scoreFilter !== 'ALL') {
      const scorePercentage = getScorePercentage(candidate.score)
      if (scoreFilter === 'HIGH') {
        scoreMatch = scorePercentage >= 80
      } else if (scoreFilter === 'MEDIUM') {
        scoreMatch = scorePercentage >= 60 && scorePercentage < 80
      } else if (scoreFilter === 'LOW') {
        scoreMatch = scorePercentage < 60
      }
    }

    return searchMatch && statusMatch && ratingMatch && scoreMatch
  })

  const handleCandidateAdded = () => {
    fetchCandidates()
    onCandidateAdded?.()
  }

  const handleCandidateDeleted = () => {
    fetchCandidates()
    onCandidateDeleted?.()
  }

  const handleRatingChange = async (candidateId: string, newValue: number | null) => {
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newValue }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar avaliação')
      }

      setCandidates(prevCandidates =>
        prevCandidates.map(candidate =>
          candidate.id === candidateId
            ? { ...candidate, rating: newValue ?? 0 }
            : candidate
        )
      )

      onCandidateUpdated?.()
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error)
      setError('Erro ao atualizar avaliação')
    }
  }

  const handleCandidateClick = (candidate: Candidate) => {
    router.push(`/admin/candidates/${candidate.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
        <p className="text-secondary-700">Carregando candidatos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar candidatos..."
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {showStatusFilter && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-secondary-700"
            >
              <option value="ALL">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Rejeitado</option>
            </select>
          )}

          {showRatingFilter && (
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-secondary-700"
            >
              <option value="ALL">Todas as avaliações</option>
              <option value="RATED">Avaliados</option>
              <option value="UNRATED">Não avaliados</option>
              <option value="HIGH">Alta avaliação (4-5)</option>
              <option value="MEDIUM">Média avaliação (2.5-3.9)</option>
              <option value="LOW">Baixa avaliação (0-2.4)</option>
            </select>
          )}

          {showScoreFilter && (
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-secondary-700"
            >
              <option value="ALL">Todas as notas</option>
              <option value="HIGH">Nota alta (80-100)</option>
              <option value="MEDIUM">Nota média (60-79)</option>
              <option value="LOW">Nota baixa (0-59)</option>
            </select>
          )}

          {showAddButton && (
            <button
              onClick={() => router.push('/admin/candidates/new')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Adicionar Candidato
            </button>
          )}
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-secondary-900">Nenhum candidato encontrado</h3>
          <p className="mt-2 text-secondary-600">Nenhum candidato corresponde aos critérios de filtro selecionados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full">
            <thead>
              <tr className="bg-secondary-50 border-b border-secondary-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">Código de Convite</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">Nota</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">Avaliação</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-secondary-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleCandidateClick(candidate)}
                      className="text-primary-600 hover:text-primary-800 hover:underline font-medium"
                    >
                      {candidate.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary-700">{candidate.position || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                      candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {candidate.status === 'APPROVED' ? 'Aprovado' :
                       candidate.status === 'REJECTED' ? 'Rejeitado' :
                       'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {candidate.inviteCode ? (
                      <div className="flex items-center justify-center">
                        <span className="font-mono text-sm bg-secondary-100 px-2 py-1 rounded text-secondary-800">{candidate.inviteCode}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/test/${candidate.inviteCode}`);
                            toast.success('Link copiado para a área de transferência!', {
                              position: 'bottom-center',
                            });
                          }}
                          className="ml-2 text-primary-500 hover:text-primary-700 transition-colors"
                          title="Copiar link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setShowInviteModal(true);
                          }}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center space-x-1 text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Gerar Convite</span>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {candidate.score ? (
                      <span className={`text-sm font-medium ${getScorePercentage(candidate.score) >= 70 ? 'text-green-600' : 
                                       getScorePercentage(candidate.score) >= 50 ? 'text-yellow-600' : 
                                       'text-red-600'}`}>
                        {typeof candidate.score === 'number' ? 
                          `${candidate.score}%` : 
                          `${candidate.score.correct}/${candidate.score.total} (${candidate.score.percentage.toFixed(1)}%)`
                        }
                      </span>
                    ) : (
                      <span className="text-secondary-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <Rating
                        value={candidate.rating || 0}
                        readOnly
                        size="small"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex gap-2 justify-center">
                      {showDeleteButton && (
                        <button
                          onClick={() => {
                            setCandidateToDelete(candidate)
                            setShowDeleteModal(true)
                          }}
                          className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                          title="Excluir candidato"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInviteModal && selectedCandidate && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false)
            setSelectedCandidate(null)
          }}
          candidate={selectedCandidate}
          onSuccess={(message) => {
            setSuccessMessage(message)
            setShowSuccessModal(true)
            fetchCandidates()
          }}
        />
      )}

      {showDeleteModal && candidateToDelete && (
        <DeleteCandidateModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setCandidateToDelete(null)
          }}
          candidate={candidateToDelete}
          onSuccess={handleCandidateDeleted}
        />
      )}

      {showSuccessModal && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          message={successMessage}
        />
      )}
    </div>
  )
}
