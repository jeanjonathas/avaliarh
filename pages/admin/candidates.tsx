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
  testId?: string
  stageScores?: {
    name: string
    correct: number
    total: number
    percentage: number
  }[]
}

interface Test {
  id: string
  title: string
  description?: string
  active: boolean
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
    requestPhoto: true,
    showResults: true,
  })
  const [inviteCode, setInviteCode] = useState('')
  const [inviteExpires, setInviteExpires] = useState('')
  const [showInviteSection, setShowInviteSection] = useState(false)
  const [showGenerateInvitePrompt, setShowGenerateInvitePrompt] = useState(false)
  const [createdCandidateId, setCreatedCandidateId] = useState('')
  const [availableTests, setAvailableTests] = useState<Test[]>([])
  const [selectedTestId, setSelectedTestId] = useState('')
  const [isLoadingTests, setIsLoadingTests] = useState(false)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isNewCodeGenerated, setIsNewCodeGenerated] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [addedCandidateId, setAddedCandidateId] = useState('')
  const [addedCandidateName, setAddedCandidateName] = useState('')

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
        console.log('CandidatesPage: Iniciando carregamento de candidatos...')
        setLoading(true)
        
        const response = await fetch('/api/admin/candidates')
        if (!response.ok) {
          throw new Error(`Erro ao carregar candidatos: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`CandidatesPage: Candidatos carregados com sucesso. Total: ${data.length}`)
        
        if (Array.isArray(data)) {
          setCandidates(data)
        } else {
          console.error('CandidatesPage: Dados de candidatos não são um array:', data)
          setCandidates([])
        }
      } catch (error) {
        setError('Erro ao carregar candidatos')
        console.error('CandidatesPage: Erro ao carregar candidatos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchCandidates()
    }
  }, [session])

  // Carregar testes disponíveis
  useEffect(() => {
    const fetchTests = async () => {
      if (showGenerateInvitePrompt || showInviteSection) {
        setIsLoadingTests(true)
        try {
          const response = await fetch('/api/admin/tests')
          if (!response.ok) {
            throw new Error('Erro ao carregar testes')
          }
          const data = await response.json()
          const activeTests = data.filter((test: Test) => test.active)
          setAvailableTests(activeTests)
          
          // Se houver apenas um teste ativo, selecione-o automaticamente
          if (activeTests.length === 1) {
            setSelectedTestId(activeTests[0].id)
          }
        } catch (error) {
          console.error('Erro ao carregar testes:', error)
        } finally {
          setIsLoadingTests(false)
        }
      }
    }

    fetchTests()
  }, [showGenerateInvitePrompt, showInviteSection])

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
    // Limpar qualquer erro anterior
    setError('')
    
    try {
      console.log('Enviando dados para criar candidato:', newCandidate)
      const response = await fetch('/api/admin/candidates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCandidate),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro na resposta do servidor:', errorText)
        throw new Error(`Erro ao adicionar candidato: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Candidato criado com sucesso:', data)
      
      // Adicionar o novo candidato no início da lista
      const updatedCandidates = [data, ...candidates]
      setCandidates(updatedCandidates)
      console.log(`Lista de candidatos atualizada. Total: ${updatedCandidates.length}`)
      
      // Resetar todos os estados relacionados ao convite para evitar geração automática
      setShowGenerateInvitePrompt(false)
      setShowInviteSection(false)
      setSelectedTestId('')
      
      // Fechar o modal de adição após adicionar o candidato com sucesso
      setShowAddModal(false)
      setNewCandidate({ name: '', email: '', phone: '', position: '', requestPhoto: true, showResults: true })
      
      // Configurar e mostrar a modal de sucesso
      setAddedCandidateId(data.id)
      setAddedCandidateName(data.name)
      setIsSuccessModalOpen(true)
      
      // Carregar testes disponíveis se ainda não foram carregados
      if (availableTests.length === 0) {
        setIsLoadingTests(true)
        try {
          const testsResponse = await fetch('/api/admin/tests')
          if (testsResponse.ok) {
            const testsData = await testsResponse.json()
            // Verificar se testsData é um array ou se tem uma propriedade tests
            const testsArray = Array.isArray(testsData) ? testsData : 
                              (testsData.tests && Array.isArray(testsData.tests) ? testsData.tests : [])
            const activeTests = testsArray.filter((test: Test) => test.active)
            setAvailableTests(activeTests)
            
            if (activeTests.length === 0) {
              console.warn('Nenhum teste ativo encontrado')
            }
          } else {
            console.error('Erro ao carregar testes:', await testsResponse.text())
          }
        } catch (error) {
          console.error('Erro ao carregar testes:', error)
        } finally {
          setIsLoadingTests(false)
        }
      }
    } catch (error) {
      console.error('Erro:', error)
      // Manter o modal aberto e exibir o erro
      setError('Erro ao adicionar candidato')
    }
  }

  // Gerar convite para o candidato recém-criado
  const handleGenerateInviteForNewCandidate = async () => {
    if (!selectedTestId) {
      setError('Selecione um teste para gerar o convite')
      return
    }

    setIsGeneratingInvite(true)
    try {
      // Usar a função auxiliar para manter a consistência do fluxo
      await generateInviteWithTest(createdCandidateId, selectedTestId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao gerar convite')
      console.error('Erro:', error)
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  // Cancelar geração de convite
  const handleCancelInviteGeneration = () => {
    setShowGenerateInvitePrompt(false)
    handleCloseModal()
  }
  
  // Fechar modal de compartilhamento
  const handleCloseShareModal = () => {
    setIsShareModalOpen(false)
    setIsNewCodeGenerated(false)
    handleCloseModal()
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
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao enviar email')
      }

      // Mostrar mensagem de sucesso temporária
      setError('')
      alert('Email enviado com sucesso!')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao enviar email')
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
    setNewCandidate({ name: '', email: '', phone: '', position: '', requestPhoto: true, showResults: true })
    setInviteCode('')
    setInviteExpires('')
    setShowInviteSection(false)
    setShowGenerateInvitePrompt(false)
    setCreatedCandidateId('')
    setSelectedTestId('')
    setIsShareModalOpen(false)
    setIsNewCodeGenerated(false)
  }
  
  // Fechar modal de sucesso
  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false)
    setAddedCandidateId('')
    setAddedCandidateName('')
  }
  
  // Gerar convite a partir da modal de sucesso
  const handleGenerateInviteFromSuccess = () => {
    if (addedCandidateId) {
      // Fechar a modal de sucesso
      setIsSuccessModalOpen(false)
      
      // Iniciar o processo de geração de convite
      // Como já carregamos os testes na adição do candidato, não precisamos mostrar o carregamento
      setIsLoadingTests(false)
      handleGenerateInvite(addedCandidateId)
    }
  }

  // Gerar convite
  const handleGenerateInvite = async (candidateId: string) => {
    try {
      // Primeiro, buscar os testes disponíveis se ainda não foram carregados
      if (availableTests.length === 0) {
        setIsLoadingTests(true)
        let loadedTests: Test[] = []
        
        try {
          const testsResponse = await fetch('/api/admin/tests')
          if (!testsResponse.ok) {
            throw new Error(`Erro ao carregar testes: ${testsResponse.status}`)
          }
          const testsData = await testsResponse.json()
          
          // Verificar se testsData é um array ou se tem uma propriedade tests
          const testsArray = Array.isArray(testsData) ? testsData : 
                            (testsData.tests && Array.isArray(testsData.tests) ? testsData.tests : [])
          
          loadedTests = testsArray.filter((test: Test) => test.active)
          setAvailableTests(loadedTests)
          
          // Se não houver testes ativos, mostrar erro
          if (loadedTests.length === 0) {
            throw new Error('Não há testes ativos disponíveis para gerar convite')
          }
          
          console.log('Testes carregados com sucesso:', loadedTests.length)
        } catch (error) {
          console.error('Erro ao carregar testes:', error)
          throw error
        } finally {
          setIsLoadingTests(false)
        }
        
        // Sempre mostrar a modal para seleção de teste, mesmo se houver apenas um
        setCreatedCandidateId(candidateId)
        setShowAddModal(true)
        setShowGenerateInvitePrompt(true)
        
        // Se houver apenas um teste, pré-selecionar ele
        if (loadedTests.length === 1) {
          setSelectedTestId(loadedTests[0].id)
        }
      } else {
        // Sempre mostrar a modal para seleção de teste, mesmo se houver apenas um
        setCreatedCandidateId(candidateId)
        setShowAddModal(true)
        setShowGenerateInvitePrompt(true)
        
        // Se houver apenas um teste, pré-selecionar ele
        if (availableTests.length === 1) {
          setSelectedTestId(availableTests[0].id)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao gerar convite')
      console.error('Erro:', error)
    }
  }
  
  // Função auxiliar para gerar convite com teste específico
  const generateInviteWithTest = async (candidateId: string, testId: string) => {
    try {
      const response = await fetch('/api/admin/candidates/generate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          candidateId,
          testId,
          expirationDays: 7,
          sendEmail: false // Mudamos para false para permitir que o usuário escolha como compartilhar
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar convite')
      }

      const data = await response.json()
      
      // Atualizar o candidato na lista
      setCandidates(candidates.map(c => 
        c.id === candidateId 
          ? { ...c, inviteCode: data.inviteCode, inviteSent: false, inviteExpires: data.inviteExpires, testId }
          : c
      ))
      
      // Configurar os dados do convite para exibição na modal de compartilhamento
      setInviteCode(data.inviteCode)
      setInviteExpires(data.inviteExpires)
      setCreatedCandidateId(candidateId)
      
      // Fechar a modal de seleção de teste e abrir a modal de compartilhamento
      setShowGenerateInvitePrompt(false)
      setShowAddModal(false)
      setIsNewCodeGenerated(true)
      setIsShareModalOpen(true)
      
      return data
    } catch (error) {
      throw error
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

          {error && !isSuccessModalOpen && (
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
                        {candidate.score !== undefined ? 
                          `${candidate.score > 1 ? candidate.score : Math.round(candidate.score * 100)}%` 
                          : '-'}
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
              {showGenerateInvitePrompt ? (
                <div>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Gerar Convite para o Candidato
                    </h3>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Deseja gerar um código de convite para <strong>{newCandidate.name}</strong>?
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Selecione o Teste
                        </label>
                        <div className="relative">
                          <select
                            value={selectedTestId}
                            onChange={(e) => setSelectedTestId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md appearance-none"
                            disabled={isLoadingTests}
                          >
                            <option value="">Selecione um teste</option>
                            {availableTests && availableTests.length > 0 ? (
                              availableTests.map(test => (
                                <option key={test.id} value={test.id}>
                                  {test.title}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>Nenhum teste disponível</option>
                            )}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            {isLoadingTests ? (
                              <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent"></div>
                            ) : (
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={handleGenerateInviteForNewCandidate}
                      disabled={!selectedTestId || isGeneratingInvite}
                      className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${
                        !selectedTestId || isGeneratingInvite 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm`}
                    >
                      {isGeneratingInvite ? 'Gerando...' : 'Gerar Convite'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelInviteGeneration}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Pular
                    </button>
                  </div>
                </div>
              ) : showInviteSection ? (
                <div>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Código de Convite Gerado
                    </h3>
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
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn-primary"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddCandidate}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Adicionar Novo Candidato
                    </h3>
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
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="requestPhoto"
                            checked={newCandidate.requestPhoto}
                            onChange={(e) => setNewCandidate({ ...newCandidate, requestPhoto: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor="requestPhoto" className="text-sm font-medium text-gray-700">
                            Solicitar foto do candidato
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showResults"
                            checked={newCandidate.showResults}
                            onChange={(e) => setNewCandidate({ ...newCandidate, showResults: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor="showResults" className="text-sm font-medium text-gray-700">
                            Mostrar resultados ao final do teste
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
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
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de sucesso após adicionar candidato */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-secondary-800">
                Candidato Adicionado
              </h2>
              <button 
                onClick={handleCloseSuccessModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm leading-5 font-medium text-green-800">
                    Candidato {addedCandidateName} adicionado com sucesso!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 mb-4 text-center">
              <p className="text-md text-gray-700 mb-4">
                Deseja gerar um código de convite para este candidato agora?
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleGenerateInviteFromSuccess}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-w-[120px]"
                  disabled={isLoadingTests}
                >
                  {isLoadingTests ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Carregando...
                    </span>
                  ) : 'Gerar Convite'}
                </button>
                <button
                  onClick={handleCloseSuccessModal}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[120px]"
                >
                  Mais Tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de compartilhamento de convite */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-secondary-800">
                {isNewCodeGenerated ? 'Novo Código Gerado' : 'Compartilhar Convite'}
              </h2>
              <button 
                onClick={handleCloseShareModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {isNewCodeGenerated && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm leading-5 font-medium text-green-800">
                      Código de convite gerado com sucesso!
                    </p>
                    <p className="text-sm leading-5 text-green-700 mt-1">
                      Você pode compartilhar este código com o candidato usando as opções abaixo.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col">
                  <div className="mb-2">
                    <span className="text-sm text-secondary-600">Código de Convite:</span>
                    <p className="text-2xl font-bold text-primary-600">{inviteCode}</p>
                  </div>
                  
                  {selectedTestId && (
                    <div className="mb-2">
                      <span className="text-sm text-secondary-600">Teste Selecionado:</span>
                      <p className="text-md font-medium text-secondary-800">
                        {availableTests.find(test => test.id === selectedTestId)?.title || 'Teste não encontrado'}
                      </p>
                    </div>
                  )}
                  
                  {inviteExpires && (
                    <div>
                      <span className="text-sm text-secondary-600">Expira em:</span>
                      <p className="text-md font-medium text-secondary-800">
                        {format(new Date(inviteExpires), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleSendEmail}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Enviar por Email
              </button>
              
              <button
                onClick={handleShareWhatsApp}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartilhar no WhatsApp
              </button>
              
              <div className="pt-4 mt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseShareModal}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CandidatesPage