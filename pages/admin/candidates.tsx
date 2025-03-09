import type { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Rating } from '@mui/material'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/admin/dashboard">
                  <Image
                    src="/images/logo_horizontal.png"
                    alt="AvaliaRH"
                    width={150}
                    height={45}
                    className="cursor-pointer"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

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
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Gerar Convite
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/admin/candidate/${candidate.id}`}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

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