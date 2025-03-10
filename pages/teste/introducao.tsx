import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

const validationSchema = Yup.object({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string().email('Email inválido').required('Email é obrigatório'),
  phone: Yup.string().required('Telefone é obrigatório'),
  position: Yup.string().required('Cargo desejado é obrigatório'),
})

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  testId?: string;
}

interface TestData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
}

const Introducao: NextPage = () => {
  const [step, setStep] = useState<'intro' | 'form'>('intro')
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null)
  const [testData, setTestData] = useState<TestData | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar se há dados do candidato na sessão
    const storedCandidateData = sessionStorage.getItem('candidateData')
    const storedTestData = sessionStorage.getItem('testData')
    
    if (storedCandidateData) {
      try {
        const parsedData = JSON.parse(storedCandidateData)
        setCandidateData(parsedData)
      } catch (error) {
        console.error('Erro ao carregar dados do candidato:', error)
      }
    }
    
    if (storedTestData) {
      try {
        const parsedData = JSON.parse(storedTestData)
        setTestData(parsedData)
      } catch (error) {
        console.error('Erro ao carregar dados do teste:', error)
      }
    }
  }, [])

  const handleSubmit = async (values: any) => {
    try {
      // Se já temos o ID do candidato, não precisamos criar um novo
      if (candidateData?.id) {
        // Redirecionar para a primeira etapa do teste com o ID do candidato
        router.push(`/teste/etapa/1?candidateId=${candidateData.id}`)
        return
      }

      // Caso contrário, salvar os dados do candidato no banco de dados
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        const data = await response.json()
        // Redirecionar para a primeira etapa do teste com o ID do candidato
        router.push(`/teste/etapa/1?candidateId=${data.id}`)
      } else {
        throw new Error('Erro ao salvar os dados')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Ocorreu um erro ao salvar seus dados. Por favor, tente novamente.')
    }
  }

  // Se temos os dados do candidato e estamos na etapa de formulário, vamos para a primeira etapa
  useEffect(() => {
    if (candidateData && step === 'form') {
      handleSubmit({
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone || '',
        position: candidateData.position || '',
      })
    }
  }, [step, candidateData])

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

        <main className="max-w-3xl mx-auto">
          {step === 'intro' ? (
            <div className="card">
              <h1 className="text-3xl font-bold text-secondary-900 mb-6">Sobre o Processo de Avaliação</h1>
              
              {candidateData && (
                <div className="bg-primary-50 p-4 rounded-lg mb-6 border border-primary-200">
                  <h2 className="text-xl font-semibold text-secondary-800 mb-2">Bem-vindo(a), {candidateData.name}!</h2>
                  <p className="text-secondary-700">
                    Seus dados já foram carregados. Você pode continuar para o teste assim que estiver pronto.
                  </p>
                </div>
              )}
              
              {testData && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                  <h2 className="text-xl font-semibold text-secondary-800 mb-2">Teste: {testData.title}</h2>
                  {testData.description && (
                    <p className="text-secondary-700 mb-2">{testData.description}</p>
                  )}
                  {testData.timeLimit && (
                    <div className="flex items-center text-blue-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>Tempo limite: {testData.timeLimit} minutos</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-6 text-secondary-700">
                <p>
                  Bem-vindo ao nosso sistema de avaliação de candidatos. Este teste foi desenvolvido para avaliar suas habilidades e competências de forma objetiva e transparente.
                </p>
                
                <h2 className="text-xl font-semibold text-secondary-800">Como funciona:</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O teste é composto por <strong>6 etapas</strong>, cada uma com <strong>10 questões</strong> de múltipla escolha.</li>
                  <li>Cada etapa avalia diferentes aspectos e habilidades relevantes para a posição.</li>
                  <li>Você deve completar cada etapa para avançar para a próxima.</li>
                  <li>Não há limite de tempo, mas recomendamos que você responda com calma e atenção.</li>
                  <li>Após concluir todas as etapas, seus resultados serão analisados pela nossa equipe de RH.</li>
                </ul>
                
                <h2 className="text-xl font-semibold text-secondary-800">Recomendações:</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Certifique-se de estar em um ambiente tranquilo e sem distrações.</li>
                  <li>Leia cada questão com atenção antes de responder.</li>
                  <li>Responda com sinceridade - o objetivo é encontrar a melhor adequação entre suas habilidades e a posição.</li>
                  <li className="text-primary-700">Suas respostas são salvas automaticamente. Se ocorrer algum problema de conexão ou se você precisar sair, poderá continuar de onde parou mais tarde.</li>
                  <li className="text-primary-700">Utilize o botão "Salvar Progresso" para salvar suas respostas sem enviar, caso precise fazer uma pausa.</li>
                </ul>
                
                <div className="mt-8">
                  <button 
                    onClick={() => setStep('form')} 
                    className="btn-primary"
                  >
                    {candidateData ? 'Iniciar Teste' : 'Continuar para o Cadastro'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <h1 className="text-3xl font-bold text-secondary-900 mb-6">Dados do Candidato</h1>
              
              <Formik
                initialValues={{ 
                  name: candidateData?.name || '', 
                  email: candidateData?.email || '', 
                  phone: candidateData?.phone || '', 
                  position: candidateData?.position || '' 
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome Completo
                      </label>
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className="input-field"
                        placeholder="Digite seu nome completo"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                        Email
                      </label>
                      <Field
                        type="email"
                        name="email"
                        id="email"
                        className="input-field"
                        placeholder="seu.email@exemplo.com"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                        Telefone
                      </label>
                      <Field
                        type="text"
                        name="phone"
                        id="phone"
                        className="input-field"
                        placeholder="(00) 00000-0000"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-secondary-700 mb-1">
                        Cargo Desejado
                      </label>
                      <Field
                        type="text"
                        name="position"
                        id="position"
                        className="input-field"
                        placeholder="Ex: Desenvolvedor Front-end"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="position" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep('intro')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !!candidateData}
                        className={`px-4 py-2 bg-primary-600 text-white rounded-md ${
                          isSubmitting || !!candidateData ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-700'
                        }`}
                      >
                        {isSubmitting ? 'Enviando...' : 'Iniciar Teste'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Introducao
