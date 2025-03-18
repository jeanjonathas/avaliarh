import { useState, useEffect } from 'react'
import Modal from '../../common/Modal'
import { InviteModalProps } from '../types'

const InviteModal = ({ isOpen, onClose, candidate, onSuccess }: InviteModalProps) => {
  const [tests, setTests] = useState<{ id: string; title: string }[]>([])
  const [selectedTest, setSelectedTest] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await fetch('/api/admin/tests', {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error('Erro ao carregar testes')
        }
        const data = await response.json()
        setTests(data)
        if (data.length > 0) {
          setSelectedTest(data[0].id)
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error)
        setError('Erro ao carregar testes')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchTests()
    }
  }, [isOpen])

  const handleGenerateInvite = async () => {
    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar convite')
      }

      const data = await response.json()
      onSuccess(`Convite gerado com sucesso! Código: ${data.inviteCode}`)
      onClose()
    } catch (error) {
      console.error('Erro ao gerar convite:', error)
      setError('Erro ao gerar convite')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerar Convite"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4">Carregando testes...</div>
        ) : error ? (
          <div className="text-red-600 py-4">{error}</div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecione o Teste
              </label>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateInvite}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                Gerar Convite
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default InviteModal
