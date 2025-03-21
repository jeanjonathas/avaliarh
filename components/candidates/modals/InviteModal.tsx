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
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerar Convite"
    >
      <div className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
            <p className="text-secondary-700">Carregando dados...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        ) : tests.length === 0 && processes.length === 0 ? (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>Nenhum teste ou processo seletivo disponível. Por favor, crie um primeiro.</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
              <h3 className="text-secondary-900 font-medium mb-3">Tipo de Vínculo</h3>
              <div className="flex flex-wrap gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => handleLinkTypeChange('process')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    linkType === 'process'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300 font-medium'
                      : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                  }`}
                >
                  Processo Seletivo
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkTypeChange('test')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    linkType === 'test'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300 font-medium'
                      : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                  }`}
                >
                  Teste Avulso
                </button>
              </div>
            </div>

            {linkType === 'process' && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Processo Seletivo
                </label>
                {processes.length === 0 ? (
                  <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
                    Nenhum processo seletivo disponível.
                  </div>
                ) : (
                  <select
                    value={selectedProcess}
                    onChange={(e) => setSelectedProcess(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
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
              <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Teste
                </label>
                {tests.length === 0 ? (
                  <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
                    Nenhum teste disponível.
                  </div>
                ) : (
                  <select
                    value={selectedTest}
                    onChange={(e) => setSelectedTest(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
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

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={isSubmitting || (linkType === 'process' && (!selectedProcess || processes.length === 0)) || 
                         (linkType === 'test' && (!selectedTest || tests.length === 0))}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Gerar Convite
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default InviteModal
