import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'

interface ResponseData {
  id: string;
  questionText: string;
  optionText: string;
  stageName: string;
}

interface ResponsesByStage {
  [stageName: string]: ResponseData[];
}

interface CompletedResponsesData {
  error: string;
  completed: boolean;
  candidateName: string;
  responsesByStage: ResponsesByStage;
}

const RespostasAnteriores: NextPage = () => {
  const router = useRouter()
  const { code } = router.query
  const [loading, setLoading] = useState(true)
  const [responseData, setResponseData] = useState<CompletedResponsesData | null>(null)

  useEffect(() => {
    // Carregar dados das respostas da sessão
    if (typeof window !== 'undefined') {
      const storedData = sessionStorage.getItem('completedResponses')
      
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setResponseData(parsedData)
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
        
        if (data.completed && data.responsesByStage) {
          console.log('Dados de respostas encontrados')
          setResponseData(data)
          // Armazenar os dados para uso futuro
          sessionStorage.setItem('completedResponses', JSON.stringify(data))
        } else {
          console.log('Dados de respostas não encontrados, redirecionando para página inicial')
          // Se não houver dados de respostas, redirecionar para a página inicial
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
            
            <div className="space-y-8">
              {Object.entries(responseData.responsesByStage).map(([stageName, responses]) => (
                <div key={stageName} className="bg-white p-6 rounded-lg shadow-md border border-primary-100">
                  <h2 className="text-xl font-semibold text-primary-700 mb-4 pb-2 border-b border-primary-100">
                    {stageName}
                  </h2>
                  
                  <div className="space-y-4">
                    {responses.map((response) => (
                      <div key={response.id} className="p-4 bg-gray-50 rounded-md">
                        <h3 className="font-medium text-secondary-800 mb-2">{response.questionText}</h3>
                        <div className="ml-4 pl-2 border-l-2 border-primary-200">
                          <p className="text-secondary-700">
                            Sua resposta: {response.optionText}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <Link href="/" className="btn-primary inline-block">
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
