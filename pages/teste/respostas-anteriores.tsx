import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'

interface ResponseData {
  id: string;
  questionText: string;
  optionText: string;
  stageName: string;
}

interface ResponsesByStage {
  [stageName: string]: ResponseData[];
}

interface ScoreData {
  score: number;
  totalQuestions: number;
  accuracyRate: number;
}

interface CompletedResponsesData {
  error: string;
  completed: boolean;
  candidateName: string;
  responsesByStage?: ResponsesByStage;
  showResults?: boolean;
  scoreData?: ScoreData;
  candidateEmail?: string;
}

// Função para sanitizar HTML (versão simples)
const sanitizeHtml = (html: string) => {
  // Esta é uma implementação básica
  // Em produção, considere usar bibliotecas como DOMPurify
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

const RespostasAnteriores: NextPage = () => {
  const router = useRouter()
  const { code } = router.query
  const [loading, setLoading] = useState(true)
  const [responseData, setResponseData] = useState<CompletedResponsesData | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [candidateData, setCandidateData] = useState<any>(null)

  useEffect(() => {
    // Verificar se o email já foi verificado anteriormente para este código
    if (typeof window !== 'undefined') {
      const storedVerification = sessionStorage.getItem(`email_verified_${code}`)
      if (storedVerification === 'true') {
        setEmailVerified(true)
      }
      
      // Carregar dados das respostas da sessão
      const storedData = sessionStorage.getItem('completedResponses')
      
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setResponseData(parsedData)
          setCandidateData(parsedData)
          setLoading(false)
        } catch (error) {
          console.error('Erro ao carregar dados das respostas:', error)
          // Não definir loading como false aqui para permitir que o segundo useEffect tente buscar os dados
        }
      } else if (code) {
        // Não definir loading como false aqui para permitir que o segundo useEffect tente buscar os dados
        console.log('Dados não encontrados na sessão, tentando buscar da API...')
      } else {
        // Se não há dados na sessão e não há código na URL, não há como buscar os dados
        setLoading(false)
      }
    }
  }, [code])

  // Se não houver dados na sessão, tentar buscar da API
  useEffect(() => {
    const fetchData = async () => {
      // Só buscar da API se não temos dados e temos um código
      if (!code || responseData || typeof code !== 'string') return
      
      try {
        console.log(`Buscando dados para o código: ${code}`)
        setLoading(true)
        const response = await fetch('/api/candidates/validate-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inviteCode: code }),
        })
        
        const data = await response.json()
        console.log('Resposta da API:', data)
        
        // Verificar se o candidato já completou o teste
        if (data.completed && data.candidateName) {
          console.log('Candidato já completou o teste')
          setCandidateData(data)
          
          // Armazenar os dados para uso futuro
          sessionStorage.setItem('completedResponses', JSON.stringify(data))
          
          // Se o email já foi verificado anteriormente, definir os dados de resposta
          if (sessionStorage.getItem(`email_verified_${code}`) === 'true') {
            setResponseData(data)
          }
        } else if (data.candidate) {
          console.log('Candidato ainda não completou o teste, redirecionando para a página de teste')
          // Se o candidato ainda não completou o teste, redirecionar para a página inicial do teste
          router.push(`/teste/introducao?code=${code}`)
          return
        } else {
          console.log('Dados não encontrados, redirecionando para página inicial')
          // Se não houver dados, redirecionar para a página inicial
          router.push('/')
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [code, responseData, router])

  const handleEmailVerification = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setEmailError('Por favor, digite seu email')
      return
    }
    
    // Verificar se o email corresponde ao email do candidato
    if (candidateData && candidateData.candidateEmail && 
        email.toLowerCase().trim() === candidateData.candidateEmail.toLowerCase().trim()) {
      setEmailVerified(true)
      setResponseData(candidateData)
      sessionStorage.setItem(`email_verified_${code}`, 'true')
      setEmailError('')
    } else {
      setEmailError('Email não corresponde ao cadastrado. Por favor, tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-lg text-secondary-700">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se temos os dados do candidato mas o email ainda não foi verificado
  if (candidateData && !emailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <header className="flex justify-between items-center mb-12">
            <Link href="/" className="text-2xl font-bold text-primary-700">
              <Image 
                src="/images/logo_horizontal.png"
                alt="AvaliaRH Logo"
                width={180}
                height={54}
                priority
              />
            </Link>
          </header>

          <main className="max-w-md mx-auto">
            <div className="card">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-center text-secondary-800 mb-2">Verificação de Identidade</h1>
              <p className="text-center text-secondary-600 mb-6">
                Olá, {candidateData.candidateName}! Para visualizar suas respostas anteriores, por favor confirme seu email.
              </p>
              
              <form onSubmit={handleEmailVerification} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Digite o email usado no cadastro"
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="w-full btn-primary"
                >
                  Verificar Email
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <Link href="/" className="text-primary-600 hover:text-primary-800 text-sm">
                  Voltar para a página inicial
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!responseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-secondary-800 mb-2">Dados não encontrados</h2>
          <p className="text-secondary-600 mb-4">Não foi possível carregar os dados das respostas anteriores.</p>
          <Link href="/" className="btn-primary inline-block">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    )
  }

  // Se não temos os dados de respostas, mas temos o nome do candidato
  if (!responseData.responsesByStage && responseData.candidateName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-secondary-800 mb-2">Olá, {responseData.candidateName}</h2>
          <p className="text-secondary-600 mb-4">
            Você já completou este teste, mas não foi possível recuperar suas respostas.
          </p>
          <Link href="/" className="btn-primary inline-block">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-12">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            <Image 
              src="/images/logo_horizontal.png"
              alt="AvaliaRH Logo"
              width={180}
              height={54}
              priority
            />
          </Link>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="card">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-center text-secondary-800 mb-2">Respostas Anteriores</h1>
            <p className="text-center text-secondary-600 mb-8">
              Olá, {responseData.candidateName}! Você já completou este teste. Abaixo estão suas respostas anteriores.
            </p>
            
            {/* Exibir a pontuação do candidato se showResults for true */}
            {responseData.showResults === true && responseData.scoreData && (
              <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-primary-100">
                <h2 className="text-xl font-semibold text-primary-700 mb-4 pb-2 border-b border-primary-100">
                  Seu Resultado
                </h2>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e6e6e6"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeDasharray={`${responseData.scoreData.accuracyRate * 100}, 100`}
                        strokeLinecap="round"
                      />
                      <text x="18" y="20.5" textAnchor="middle" fontSize="8" fill="#333">
                        {Math.round(responseData.scoreData.accuracyRate * 100)}%
                      </text>
                    </svg>
                  </div>
                  
                  <div className="text-center md:text-left">
                    <p className="text-lg text-secondary-700">
                      <span className="font-semibold">Pontuação:</span> {responseData.scoreData.score} de {responseData.scoreData.totalQuestions} pontos
                    </p>
                    <p className="text-lg text-secondary-700">
                      <span className="font-semibold">Taxa de acerto:</span> {Math.round(responseData.scoreData.accuracyRate * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mensagem informativa quando os resultados não são exibidos */}
            {responseData.showResults !== true && responseData.scoreData && (
              <div className="mb-8 bg-blue-50 p-6 rounded-lg shadow-md border border-blue-100">
                <div className="flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-blue-700">
                    Informação
                  </h2>
                </div>
                <p className="text-blue-700">
                  Suas respostas foram registradas com sucesso. Os resultados detalhados não estão disponíveis para visualização neste momento.
                </p>
              </div>
            )}
            
            {/* Exibir respostas agrupadas por etapa */}
            {responseData.responsesByStage && Object.entries(responseData.responsesByStage).map(([stageName, responses]) => (
              <div key={stageName} className="mb-8">
                <h2 className="text-xl font-semibold text-primary-700 mb-4 pb-2 border-b border-primary-100">
                  {stageName}
                </h2>
                
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                      <h3 
                        className="font-medium text-secondary-800 mb-2"
                        dangerouslySetInnerHTML={{ 
                          __html: sanitizeHtml(response.questionText) 
                        }}
                      />
                      <div className="text-secondary-600">
                        <span className="font-medium">Sua resposta:</span>{' '}
                        <span
                          dangerouslySetInnerHTML={{ 
                            __html: sanitizeHtml(response.optionText) 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="text-center mt-12">
              <Link href="/" className="btn-primary">
                Voltar para a página inicial
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default RespostasAnteriores
