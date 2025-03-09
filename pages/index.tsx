import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
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
  const router = useRouter()

  const handleInviteSubmit = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Erro ao validar código de convite')
      }

      // Armazenar os dados do candidato na sessão
      sessionStorage.setItem('candidateData', JSON.stringify(data.candidate))
      
      // Armazenar os dados do teste na sessão, se disponíveis
      if (data.test) {
        sessionStorage.setItem('testData', JSON.stringify(data.test))
      }
      
      // Redirecionar para a página de introdução do teste
      router.push('/teste/introducao')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-16">
          <Image 
            src="/images/logo_horizontal.png" 
            alt="AvaliaRH" 
            width={250} 
            height={75} 
            priority 
          />
          <Link href="/admin/login" className="text-primary-600 hover:text-primary-800 font-medium">
            Área do Administrador
          </Link>
        </header>

        <main className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2">
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
              Bem-vindo ao Sistema de Avaliação de Candidatos
            </h1>
            <p className="text-lg text-secondary-600 mb-8">
              Estamos felizes em tê-lo como candidato. Este sistema foi desenvolvido para avaliar suas habilidades e competências de forma eficiente e transparente.
            </p>
            
            {!showInviteInput ? (
              <button 
                onClick={() => setShowInviteInput(true)}
                className="btn-primary inline-block text-lg"
              >
                Iniciar Processo de Avaliação
              </button>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md border border-primary-100 max-w-md">
                <h3 className="text-xl font-semibold text-secondary-800 mb-4">Digite seu código de convite</h3>
                <form onSubmit={handleInviteSubmit}>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Digite o código de 4 dígitos"
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-2xl tracking-widest"
                      maxLength={4}
                      required
                    />
                  </div>
                  {error && (
                    <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteInput(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verificando...' : 'Continuar'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md h-80">
              <div className="absolute inset-0 bg-primary-100 rounded-lg transform rotate-3"></div>
              <div className="absolute inset-0 bg-white rounded-lg shadow-lg flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-5xl text-primary-500 mb-4">📝</div>
                  <h2 className="text-2xl font-bold text-secondary-800 mb-2">Processo Simplificado</h2>
                  <p className="text-secondary-600">
                    6 etapas com 10 questões cada, projetadas para avaliar diferentes aspectos de suas habilidades.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <section className="mt-24 mb-16">
          <h2 className="text-3xl font-bold text-center text-secondary-800 mb-12">Como Funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Convite</h3>
              <p className="text-secondary-600">Receba seu código de convite e insira-o para iniciar o processo de avaliação.</p>
            </div>
            <div className="card text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Avaliação</h3>
              <p className="text-secondary-600">Complete as 6 etapas do teste, com 10 questões de múltipla escolha em cada.</p>
            </div>
            <div className="card text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Resultado</h3>
              <p className="text-secondary-600">Após concluir, nossos recrutadores analisarão seu desempenho e entrarão em contato.</p>
            </div>
          </div>
        </section>

        <footer className="text-center text-secondary-500 text-sm mt-8">
          <p>&copy; {new Date().getFullYear()} AvaliaRH - Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  )
}

export default Home
