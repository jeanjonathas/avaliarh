import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'

interface TestData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
}

const Home: NextPage = () => {
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showInviteInput, setShowInviteInput] = useState(false)
  const [validationSuccess, setValidationSuccess] = useState(false)
  const [candidate, setCandidate] = useState<any>(null)
  const router = useRouter()

  // Efeito para redirecionar após a validação bem-sucedida
  useEffect(() => {
    if (validationSuccess && candidate) {
      // Pequeno atraso para permitir a transição visual
      const redirectTimer = setTimeout(() => {
        router.push('/teste/introducao')
      }, 300)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [validationSuccess, candidate, router])

  // Usando useCallback para memorizar a função e evitar recriações desnecessárias
  const handleInviteSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/candidates/validate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Verificar se o teste já foi concluído, mesmo com erro
        if (data.completed && data.responsesByStage) {
          console.log('Teste já concluído, redirecionando para página de respostas anteriores');
          // Armazenar os dados das respostas na sessão
          sessionStorage.setItem('completedResponses', JSON.stringify(data));
          // Redirecionar para a página de visualização de respostas
          router.push(`/teste/respostas-anteriores?code=${inviteCode}`);
          return;
        }
        
        throw new Error(data.error || 'Erro ao validar código de convite')
      }

      // Armazenar os dados do candidato na sessão
      sessionStorage.setItem('candidateData', JSON.stringify(data.candidate))
      
      // Armazenar os dados do teste na sessão, se disponíveis
      if (data.test) {
        sessionStorage.setItem('testData', JSON.stringify(data.test))
      }
      
      // Definir o estado de sucesso e os dados do candidato
      setCandidate(data.candidate)
      setValidationSuccess(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [inviteCode])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-6 sm:py-12 flex flex-col min-h-screen">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-16 gap-4">
          <div className="w-full sm:w-auto flex justify-center sm:justify-start">
            <Image 
              src="/images/logo_horizontal.png" 
              alt="AvaliaRH" 
              width={200} 
              height={60} 
              priority 
              unoptimized={true}
              className="max-w-[200px] h-auto"
            />
          </div>
          <div className="hidden sm:block">
            <Link href="/admin/login" className="text-primary-600 hover:text-primary-800 font-medium">
              Área do Administrador
            </Link>
          </div>
        </header>

        <main className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 flex-grow">
          <div className="w-full md:w-1/2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary-900 mb-4 sm:mb-6 text-center md:text-left bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Bem-vindo ao Sistema de Avaliação de Candidatos
            </h1>
            <p className="text-base sm:text-lg text-secondary-600 mb-6 sm:mb-8 text-center md:text-left">
              Estamos felizes em tê-lo como candidato. Este sistema foi desenvolvido para avaliar suas habilidades e competências de forma eficiente e transparente.
            </p>
            
            {!showInviteInput ? (
              <div className="flex justify-center md:justify-start">
                <button 
                  onClick={() => setShowInviteInput(true)}
                  className="btn-primary text-lg px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 transform hover:-translate-y-1"
                >
                  Iniciar Processo de Avaliação
                </button>
              </div>
            ) : !validationSuccess ? (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-primary-100 max-w-md w-full mx-auto md:mx-0">
                <h3 className="text-lg sm:text-xl font-semibold text-secondary-800 mb-4 text-center md:text-left">Digite seu código de convite</h3>
                <form onSubmit={handleInviteSubmit}>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Digite o código de 4 dígitos"
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-xl sm:text-2xl tracking-widest"
                      maxLength={4}
                      required
                    />
                  </div>
                  {error && (
                    <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteInput(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 w-full sm:flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verificando...' : 'Continuar'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-primary-100 max-w-md w-full mx-auto md:mx-0 transition-all duration-300 opacity-100">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-secondary-800 mb-2">Código Validado!</h3>
                  <p className="text-secondary-600 mb-4">Redirecionando para o teste...</p>
                </div>
              </div>
            )}
          </div>
          <div className="w-full md:w-1/2 flex justify-center mt-8 md:mt-0">
            <div className="relative w-full max-w-sm md:max-w-md h-64 sm:h-80">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg transform rotate-3"></div>
              <div className="absolute inset-0 bg-white rounded-lg shadow-lg flex items-center justify-center p-4 sm:p-8 border border-primary-100">
                <div className="text-center">
                  <span className="text-4xl sm:text-5xl text-primary-500 mb-2 sm:mb-4 block animate-pulse">📝</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-secondary-800 mb-2 bg-gradient-to-r from-primary-500 to-secondary-600 bg-clip-text text-transparent">Processo Simplificado</h2>
                  <p className="text-sm sm:text-base text-secondary-600">
                    6 etapas com 10 questões cada, projetadas para avaliar diferentes aspectos de suas habilidades.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <section className="mt-16 sm:mt-24 mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-secondary-800 mb-8 sm:mb-12 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Como Funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="card text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Convite</h3>
              <p className="text-secondary-600">Receba seu código de convite e insira-o para iniciar o processo de avaliação.</p>
            </div>
            <div className="card text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Avaliação</h3>
              <p className="text-secondary-600">Complete as 6 etapas do teste, com 10 questões de múltipla escolha em cada.</p>
            </div>
            <div className="card text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Resultado</h3>
              <p className="text-secondary-600">Após concluir, nossos recrutadores analisarão seu desempenho e entrarão em contato.</p>
            </div>
          </div>
        </section>

        <footer className="text-center text-secondary-500 text-xs sm:text-sm mt-8 pb-4">
          <div className="sm:hidden mb-4">
            <Link href="/admin/login" className="text-primary-600 hover:text-primary-800 font-medium text-sm inline-block px-4 py-2 rounded-full bg-white shadow-sm border border-primary-100">
              Área do Administrador
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} AvaliaRH - Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  )
}

export default Home
