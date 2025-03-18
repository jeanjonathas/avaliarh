import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Candidate } from '../types'
import { toast } from 'react-toastify'

interface Test {
  id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  active: boolean;
}

export interface CandidateInfoTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export const CandidateInfoTab = ({ candidate, onUpdate }: CandidateInfoTabProps) => {
  const [formData, setFormData] = useState({
    name: candidate.name || '',
    email: candidate.email || '',
    position: candidate.position || '',
    status: candidate.status || 'PENDING',
    observations: candidate.observations || '',
    testId: candidate.testId || ''
  })

  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<Test[]>([])
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await fetch('/api/admin/tests', {
          credentials: 'include'
        })
        const data = await response.json()
        if (data.success) {
          setTests(data.tests)
        } else {
          toast.error('Erro ao carregar testes: ' + data.error)
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error)
        toast.error('Erro ao carregar testes')
      } finally {
        setLoading(false)
      }
    }

    fetchTests()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Informações atualizadas com sucesso')
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar informações')
      }
    } catch (error) {
      console.error('Erro ao atualizar candidato:', error)
      toast.error('Erro ao atualizar informações')
    } finally {
      setIsSaving(false)
    }
  }

  const generateNewInvite = async () => {
    setIsGeneratingInvite(true)

    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'generateInvite' }),
      })

      if (response.ok) {
        toast.success('Novo código de convite gerado com sucesso')
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao gerar novo código')
      }
    } catch (error) {
      console.error('Erro ao gerar convite:', error)
      toast.error('Erro ao gerar novo código')
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleShare = async () => {
    const testUrl = `${window.location.origin}/test/${candidate.inviteCode}`
    try {
      await navigator.clipboard.writeText(testUrl)
      toast.success('Link copiado para a área de transferência')
    } catch (error) {
      console.error('Erro ao copiar link:', error)
      toast.error('Erro ao copiar link')
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row md:space-x-8">
          <div className="md:w-2/3 space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Cargo Pretendido
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md"
              >
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Observações
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                rows={5}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 text-white rounded-md ${
                  isSaving
                    ? 'bg-primary-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
          
          <div className="md:w-1/3 space-y-6 mt-6 md:mt-0">
            {candidate.photoUrl && (
              <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-secondary-800 mb-3">Foto do Candidato</h3>
                <div className="flex flex-col items-center">
                  <div 
                    className="relative w-48 h-auto rounded-lg overflow-hidden border border-secondary-200 cursor-pointer"
                    onClick={() => setShowPhotoModal(true)}
                  >
                    <img 
                      src={candidate.photoUrl} 
                      alt={`Foto de ${candidate.name}`}
                      className="max-w-full w-full object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-secondary-600 mt-2">Clique na foto para visualizar em tamanho completo</p>
                </div>
              </div>
            )}

            <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-secondary-800 mb-3">Informações do Convite</h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-md border border-secondary-200">
                  <label className="block text-sm text-secondary-600 mb-1">
                    Selecione o Teste:
                  </label>
                  <select
                    name="testId"
                    value={formData.testId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                    disabled={loading}
                  >
                    <option value="">Selecione um teste</option>
                    {tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="bg-white p-3 rounded-md border border-secondary-200">
                  <span className="text-sm text-secondary-600">Código do Convite:</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-medium text-lg text-primary-600">{candidate?.inviteCode}</p>
                    <button
                      type="button"
                      onClick={generateNewInvite}
                      disabled={isGeneratingInvite}
                      className={`px-3 py-1 text-sm ${
                        isGeneratingInvite 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                      } rounded`}
                    >
                      {isGeneratingInvite 
                        ? 'Gerando...' 
                        : candidate?.inviteCode 
                          ? 'Gerar Novo' 
                          : 'Gerar Código'
                      }
                    </button>
                  </div>
                  {candidate.inviteCode && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleShare}
                        className="w-full px-3 py-1 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        Compartilhar Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {showPhotoModal && candidate.photoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-lg p-4">
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={candidate.photoUrl}
              alt={`Foto de ${candidate.name}`}
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}
