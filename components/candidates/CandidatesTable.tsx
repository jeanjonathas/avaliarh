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
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    return <div className="text-center p-4">Carregando candidatos...</div>
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar candidatos..."
            className="w-full p-2 border rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {showStatusFilter && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded"
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
            className="p-2 border rounded"
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
            className="p-2 border rounded"
          >
            <option value="ALL">Todas as notas</option>
            <option value="HIGH">Nota alta (80-100)</option>
            <option value="MEDIUM">Nota média (60-79)</option>
            <option value="LOW">Nota baixa (0-59)</option>
          </select>
        )}

        {showAddButton && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Adicionar Candidato
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Cargo</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Data do Teste</th>
              <th className="px-4 py-2">Nota</th>
              <th className="px-4 py-2">Avaliação</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.map((candidate) => (
              <tr key={candidate.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleCandidateClick(candidate)}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {candidate.name}
                  </button>
                </td>
                <td className="px-4 py-2">{candidate.email}</td>
                <td className="px-4 py-2">{candidate.position || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded ${
                    candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {candidate.status === 'APPROVED' ? 'Aprovado' :
                     candidate.status === 'REJECTED' ? 'Rejeitado' :
                     'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {candidate.testDate ? format(new Date(candidate.testDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </td>
                <td className="px-4 py-2">
                  {candidate.score ? (
                    <span className={`text-green-500`}>
                      {typeof candidate.score === 'number' ? 
                        `${candidate.score}%` : 
                        `${candidate.score.correct}/${candidate.score.total} (${candidate.score.percentage.toFixed(1)}%)`
                      }
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2">
                  <Rating
                    value={candidate.rating || 0}
                    onChange={(_, newValue) => handleRatingChange(candidate.id, newValue)}
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate)
                        setShowInviteModal(true)
                      }}
                      className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    >
                      Convidar
                    </button>
                    {showDeleteButton && (
                      <button
                        onClick={() => {
                          setCandidateToDelete(candidate)
                          setShowDeleteModal(true)
                        }}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddCandidateModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCandidateAdded}
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

      {showDetailsModal && selectedCandidate && (
        <CandidateDetails
          candidate={selectedCandidate}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedCandidate(null)
          }}
          onUpdate={() => {
            fetchCandidates()
            onCandidateUpdated?.()
          }}
        />
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  )
}
