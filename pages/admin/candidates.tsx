import type { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Rating } from '@mui/material'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Navbar from '../../components/admin/Navbar'

interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  testDate: string
  interviewDate?: string
  completed: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rating?: number
  observations?: string
  score?: number
  inviteCode?: string
  inviteSent: boolean
  inviteExpires?: string
  inviteAttempts: number
  stageScores?: {
    name: string
    correct: number
    total: number
    percentage: number
  }[]
}

const CandidatesPage: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [scoreFilter, setScoreFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
  })
  const [inviteCode, setInviteCode] = useState('')
  const [inviteExpires, setInviteExpires] = useState('')
  const [showInviteSection, setShowInviteSection] = useState(false)

  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  // Carregar candidatos
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/admin/candidates')
        if (!response.ok) {
          throw new Error('Erro ao carregar candidatos')
        }
        const data = await response.json()
        setCandidates(data)
      } catch (error) {
        setError('Erro ao carregar candidatos')
        console.error('Erro:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchCandidates()
    }
  }, [session])

  // Filtrar candidatos
  const filteredCandidates = candidates.filter(candidate => {
    const searchMatch = searchTerm === '' || 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.position && candidate.position.toLowerCase().includes(searchTerm.toLowerCase()))

    const statusMatch = statusFilter === 'ALL' || candidate.status === statusFilter

    let ratingMatch = true
    if (ratingFilter !== 'ALL') {
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
    if (scoreFilter !== 'ALL') {
      if (scoreFilter === 'HIGH') {
        scoreMatch = candidate.score !== undefined && candidate.score >= 80
      } else if (scoreFilter === 'MEDIUM') {
        scoreMatch = candidate.score !== undefined && candidate.score >= 60 && candidate.score < 80
      } else if (scoreFilter === 'LOW') {
        scoreMatch = candidate.score !== undefined && candidate.score < 60
      }
    }

    return searchMatch && statusMatch && ratingMatch && scoreMatch
  })

  // Adicionar novo candidato
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/candidates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCandidate),
      })

      if (!response.ok) {
        throw new Error('Erro ao adicionar candidato')
      }

      const data = await response.json()
      setCandidates([data, ...candidates])
      
      // Gerar convite automaticamente
      try {
        const inviteResponse = await fetch('/api/admin/candidates/generate-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            candidateId: data.id,
            expirationDays: 7,
            sendEmail: false
          }),
        })

        if (!inviteResponse.ok) {
          throw new Error('Erro ao gerar convite')
        }

        const inviteData = await inviteResponse.json()
        setInviteCode(inviteData.inviteCode)
        setInviteExpires(inviteData.inviteExpires)
        setShowInviteSection(true)
      } catch (error) {
        setError('Erro ao gerar convite')
        console.error('Erro:', error)
      }
    } catch (error) {
      setError('Erro ao adicionar candidato')
      console.error('Erro:', error)
    }
  }

  // Enviar convite por email
  const handleSendEmail = async () => {
    try {
      const response = await fetch('/api/admin/candidates/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: newCandidate.email,
          inviteCode
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar email')
      }

      setError('')
    } catch (error) {
      setError('Erro ao enviar email')
      console.error('Erro:', error)
    }
  }

  // Compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    const message = `Olá! Aqui está seu código de convite para o processo seletivo: ${inviteCode}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  // Abrir modal de exclusão
  const handleOpenDeleteModal = (candidate: Candidate) => {
    setCandidateToDelete(candidate)
    setShowDeleteModal(true)
  }

  // Excluir candidato
  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return

    try {
      const response = await fetch(`/api/admin/candidates/${candidateToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir candidato')
      }

      // Remover candidato da lista
      setCandidates(candidates.filter(c => c.id !== candidateToDelete.id))
      setShowDeleteModal(false)
      setError('')
    } catch (error) {
      console.error('Erro ao excluir candidato:', error)
      setError('Erro ao excluir candidato')
    }
  }

  // Fechar modal e resetar estados
  const handleCloseModal = () => {
    setShowAddModal(false)
    setNewCandidate({ name: '', email: '', phone: '', position: '' })
    setInviteCode('')
    setInviteExpires('')
    setShowInviteSection(false)
  }

  // Gerar convite
  const handleGenerateInvite = async (candidateId: string) => {
    try {
      const response = await fetch('/api/admin/candidates/generate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          candidateId,
          expirationDays: 7,
          sendEmail: true
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar convite')
      }

      const data = await response.json()
      
      // Atualizar o candidato na lista
      setCandidates(candidates.map(c => 
        c.id === candidateId 
          ? { ...c, inviteCode: data.inviteCode, inviteSent: true, inviteExpires: data.inviteExpires }
          : c
      ))
    } catch (error) {
      setError('Erro ao gerar convite')
      console.error('Erro:', error)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Candidatos</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Adicionar Candidato
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome, email ou cargo"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select-field"
                  >
                    <option value="ALL">Todos</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="APPROVED">Aprovados</option>
                    <option value="REJECTED">Reprovados</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Avaliação
                  </label>
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="select-field"
                  >
                    <option value="ALL">Todas</option>
                    <option value="RATED">Avaliados</option>
                    <option value="UNRATED">Não avaliados</option>
                    <option value="HIGH">Alta (4-5 estrelas)</option>
                    <option value="MEDIUM">Média (2.5-3.5 estrelas)</option>
                    <option value="LOW">Baixa (0.5-2 estrelas)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pontuação
                  </label>
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="select-field"
                  >
                    <option value="ALL">Todas</option>
                    <option value="HIGH">Alta (≥80%)</option>
                    <option value="MEDIUM">Média (60-79%)</option>
                    <option value="LOW">Baixa (≤59%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Candidatos */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome/Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontuação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avaliação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Convite
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {candidate.position || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {candidate.status === 'APPROVED' ? 'Aprovado' :
                           candidate.status === 'REJECTED' ? 'Reprovado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {candidate.score !== undefined ? `${candidate.score}%` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Rating
                          value={candidate.rating || 0}
                          readOnly
                          precision={0.5}
                          size="small"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {candidate.inviteCode ? (
                          <div>
                            <div className="font-medium text-gray-900">{candidate.inviteCode}</div>
                            {candidate.inviteExpires && (
                              <div className="text-xs text-gray-500">
                                Expira: {format(new Date(candidate.inviteExpires), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateInvite(candidate.id)}
                            className="px-2 py-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors duration-200 text-xs font-medium flex items-center justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Gerar Convite
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex flex-col space-y-1.5 items-end">
                          <Link
                            href={`/admin/candidate/${candidate.id}`}
                            className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200 text-xs font-medium flex items-center w-24 justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            Detalhes
                          </Link>
                          <button
                            onClick={() => handleOpenDeleteModal(candidate)}
                            className="px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors duration-200 text-xs font-medium flex items-center w-24 justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && candidateToDelete && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Excluir candidato
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Tem certeza que deseja excluir o candidato <strong>{candidateToDelete.name}</strong>? Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteCandidate}
                >
                  Excluir
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Candidato */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddCandidate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {showInviteSection ? 'Código de Convite Gerado' : 'Adicionar Novo Candidato'}
                  </h3>
                  {!showInviteSection ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome
                        </label>
                        <input
                          type="text"
                          required
                          value={newCandidate.name}
                          onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={newCandidate.email}
                          onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          value={newCandidate.phone}
                          onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cargo
                        </label>
                        <input
                          type="text"
                          value={newCandidate.position}
                          onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary-600 mb-2">{inviteCode}</div>
                        <div className="text-sm text-gray-500">
                          Expira em: {format(new Date(inviteExpires), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <div className="flex justify-center space-x-4">
                        <button
                          type="button"
                          onClick={handleSendEmail}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                        >
                          Enviar por Email
                        </button>
                        <button
                          type="button"
                          onClick={handleShareWhatsApp}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                        >
                          Compartilhar no WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  {!showInviteSection ? (
                    <>
                      <button
                        type="submit"
                        className="btn-primary sm:ml-3"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn-primary"
                    >
                      Concluir
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CandidatesPage