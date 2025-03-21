import { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

const Agradecimento: NextPage = () => {
  const router = useRouter()
  
  useEffect(() => {
    // Atualizar o status do candidato para 'completed'
    const updateCandidateStatus = async () => {
      const { candidateId } = router.query
      if (candidateId) {
        try {
          await fetch(`/api/candidates/${candidateId}/complete`, {
            method: 'PUT',
          })
        } catch (error) {
          console.error('Erro ao atualizar status do candidato:', error)
        }
      }
    }
    
    updateCandidateStatus()
  }, [router.query])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <header className="flex justify-center mb-8">
          <Image 
            src="/images/logo_horizontal.png"
            alt="Admitto Logo"
            width={220}
            height={66}
            priority
            className="mx-auto"
          />
        </header>
        
        <div className="card text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-secondary-900 mb-4">Avaliação Concluída!</h1>
          
          <p className="text-lg text-secondary-600 mb-8">
            Agradecemos por completar o processo de avaliação. Suas respostas foram registradas com sucesso.
          </p>
          
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-secondary-800 mb-3">O que acontece agora?</h2>
            <p className="text-secondary-600">
              Nossa equipe de RH irá analisar seus resultados e entrará em contato com você nos próximos dias 
              para informar sobre os próximos passos do processo seletivo.
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-secondary-700">
              Se tiver alguma dúvida sobre o processo seletivo, entre em contato conosco pelo e-mail: 
              <a href="mailto:rh@empresa.com" className="text-primary-600 hover:text-primary-800 ml-1">
                rh@empresa.com
              </a>
            </p>
            
            <Link href="/" className="btn-primary inline-block">
              Voltar para a Página Inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Agradecimento
