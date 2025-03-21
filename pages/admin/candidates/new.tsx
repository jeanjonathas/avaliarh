import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../../components/admin/AdminLayout'
import toast from 'react-hot-toast'

interface Test {
  id: string;
  title: string;
}

interface Process {
  id: string;
  name: string;
}

interface TestsResponse {
  success: boolean;
  tests: Test[];
}

const AddCandidatePage = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tests, setTests] = useState<Test[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    instagram: '',
    resumeUrl: '',
    testId: '',
    processId: '',
    requestPhoto: true,
    showResults: true
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [testsResponse, processesResponse] = await Promise.all([
          fetch('/api/admin/tests?active=true', { credentials: 'include' }),
          fetch('/api/admin/processes', { credentials: 'include' })
        ])

        if (!testsResponse.ok) {
          throw new Error('Erro ao carregar testes')
        }

        const testsData = await testsResponse.json()
        
        // Verificar o formato da resposta e extrair os testes
        if (testsData.success && Array.isArray(testsData.tests)) {
          setTests(testsData.tests)
        } else if (Array.isArray(testsData)) {
          setTests(testsData)
        } else {
          console.error('Formato de resposta inesperado:', testsData)
        }

        // Processar dados de processos seletivos
        if (processesResponse.ok) {
          const processesData = await processesResponse.json()
          setProcesses(processesData)
        } else {
          console.warn('Não foi possível carregar processos seletivos')
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados necessários')
        toast.error('Erro ao carregar dados necessários', {
          position: 'bottom-center',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCandidate.name || !newCandidate.email) {
      toast.error('Nome e email são obrigatórios', {
        position: 'bottom-center',
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      console.log('Enviando dados:', newCandidate)
      
      const response = await fetch('/api/admin/candidates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
        credentials: 'include'
      })

      const responseData = await response.json()
      console.log('Resposta:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao adicionar candidato')
      }

      toast.success('Candidato adicionado com sucesso!', {
        position: 'bottom-center',
      })
      
      // Redirecionar para a lista de candidatos
      router.push('/admin/candidates')
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao adicionar candidato',
        {
          position: 'bottom-center',
        }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminLayout>
      <Head>
        <title>Adicionar Candidato | AvaliaRH</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Adicionar Candidato</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mr-3"></div>
            <p className="text-secondary-700">Carregando...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 border border-secondary-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nome completo do candidato"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={newCandidate.position}
                    onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Cargo ou posição"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={newCandidate.instagram}
                    onChange={(e) => setNewCandidate({ ...newCandidate, instagram: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="@usuario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    URL do Currículo
                  </label>
                  <input
                    type="url"
                    value={newCandidate.resumeUrl}
                    onChange={(e) => setNewCandidate({ ...newCandidate, resumeUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://exemplo.com/curriculo.pdf"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Teste
                  </label>
                  <select
                    value={newCandidate.testId}
                    onChange={(e) => setNewCandidate({ ...newCandidate, testId: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">Selecione um teste (opcional)</option>
                    {tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Processo Seletivo
                  </label>
                  <select
                    value={newCandidate.processId}
                    onChange={(e) => setNewCandidate({ ...newCandidate, processId: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">Selecione um processo (opcional)</option>
                    {processes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requestPhoto"
                    checked={newCandidate.requestPhoto}
                    onChange={(e) => setNewCandidate({ ...newCandidate, requestPhoto: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <label htmlFor="requestPhoto" className="ml-2 block text-sm text-secondary-700">
                    Solicitar foto do candidato
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showResults"
                    checked={newCandidate.showResults}
                    onChange={(e) => setNewCandidate({ ...newCandidate, showResults: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <label htmlFor="showResults" className="ml-2 block text-sm text-secondary-700">
                    Mostrar resultados ao candidato
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adicionando...
                    </>
                  ) : 'Adicionar Candidato'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AddCandidatePage
