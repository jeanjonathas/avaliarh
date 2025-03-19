import { useState, useEffect } from 'react'
import Modal from '../../common/Modal'
import { InviteModalProps } from '../types'
import toast from 'react-hot-toast'

const InviteModal = ({ isOpen, onClose, candidate, onSuccess }: InviteModalProps) => {
  const [tests, setTests] = useState<{ id: string; title: string }[]>([])
  const [processes, setProcesses] = useState<{ id: string; name: string }[]>([])
  const [selectedTest, setSelectedTest] = useState('')
  const [selectedProcess, setSelectedProcess] = useState('')
  const [linkType, setLinkType] = useState<'process' | 'test'>('test')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testsResponse, processesResponse] = await Promise.all([
          fetch('/api/admin/tests', { credentials: 'include' }),
          fetch('/api/admin/processes', { credentials: 'include' })
        ]);

        if (!testsResponse.ok) {
          throw new Error('Erro ao carregar testes')
        }

        const testsData = await testsResponse.json()
        
        // Verificar o formato da resposta e extrair os testes
        if (testsData.success && Array.isArray(testsData.tests)) {
          setTests(testsData.tests)
          if (testsData.tests.length > 0) {
            setSelectedTest(testsData.tests[0].id)
          }
        } else if (Array.isArray(testsData)) {
          // Fallback para o caso da API retornar diretamente um array
          setTests(testsData)
          if (testsData.length > 0) {
            setSelectedTest(testsData[0].id)
          }
        } else {
          console.error('Formato de resposta inesperado:', testsData)
          throw new Error('Formato de resposta inesperado')
        }

        // Processar dados de processos seletivos
        if (processesResponse.ok) {
          const processesData = await processesResponse.json()
          setProcesses(processesData)
          if (processesData.length > 0) {
            setSelectedProcess(processesData[0].id)
          }
        } else {
          console.warn('Não foi possível carregar processos seletivos')
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setError('Erro ao carregar dados necessários')
        toast.error('Erro ao carregar dados necessários', {
          position: 'bottom-center',
        })
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const handleLinkTypeChange = (type: 'process' | 'test') => {
    setLinkType(type)
  }

  const handleGenerateInvite = async () => {
    try {
      if ((linkType === 'process' && !selectedProcess) || (linkType === 'test' && !selectedTest)) {
        toast.error('Selecione um processo ou teste antes de gerar o convite', {
          position: 'bottom-center',
        });
        return;
      }

      const response = await fetch(`/api/admin/candidates/${candidate.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processId: linkType === 'process' ? selectedProcess : null,
          testId: linkType === 'test' ? selectedTest : null,
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar convite')
      }

      const data = await response.json()
      toast.success(`Convite gerado com sucesso! Código: ${data.inviteCode}`, {
        position: 'bottom-center',
      });
      onSuccess(`Convite gerado com sucesso! Código: ${data.inviteCode}`)
      onClose()
    } catch (error) {
      console.error('Erro ao gerar convite:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao gerar convite',
        {
          position: 'bottom-center',
        }
      );
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
          <div className="text-center py-4">Carregando dados...</div>
        ) : error ? (
          <div className="text-red-600 py-4">{error}</div>
        ) : tests.length === 0 && processes.length === 0 ? (
          <div className="text-amber-600 py-4">Nenhum teste ou processo seletivo disponível. Por favor, crie um primeiro.</div>
        ) : (
          <>
            <div className="bg-white p-3 rounded-md border border-gray-200">
              <label className="block text-sm text-gray-700 mb-1">
                Tipo de Vínculo:
              </label>
              <div className="flex space-x-4 mb-3">
                <button
                  type="button"
                  onClick={() => handleLinkTypeChange('process')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    linkType === 'process'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Processo Seletivo
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkTypeChange('test')}
                  className={`px-3 py-2 text-sm rounded-md ${
                    linkType === 'test'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  Teste Avulso
                </button>
              </div>
            </div>

            {linkType === 'process' && (
              <div className="bg-white p-3 rounded-md border border-gray-200">
                <label className="block text-sm text-gray-700 mb-1">
                  Processo Seletivo:
                </label>
                {processes.length === 0 ? (
                  <div className="text-amber-600 py-2">Nenhum processo seletivo disponível.</div>
                ) : (
                  <select
                    value={selectedProcess}
                    onChange={(e) => setSelectedProcess(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    {processes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {linkType === 'test' && (
              <div className="bg-white p-3 rounded-md border border-gray-200">
                <label className="block text-sm text-gray-700 mb-1">
                  Teste:
                </label>
                {tests.length === 0 ? (
                  <div className="text-amber-600 py-2">Nenhum teste disponível.</div>
                ) : (
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
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={(linkType === 'process' && (!selectedProcess || processes.length === 0)) || 
                         (linkType === 'test' && (!selectedTest || tests.length === 0))}
                className={`px-4 py-2 text-white rounded ${
                  (linkType === 'process' && (!selectedProcess || processes.length === 0)) || 
                  (linkType === 'test' && (!selectedTest || tests.length === 0))
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
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
