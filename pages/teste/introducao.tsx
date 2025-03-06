import { NextPage } from 'next'
import { useState } from 'react'
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

const Introducao: NextPage = () => {
  const [step, setStep] = useState<'intro' | 'form'>('intro')
  const router = useRouter()

  const handleSubmit = async (values: any) => {
    try {
      // Salvar os dados do candidato no banco de dados
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
                    Continuar para o Cadastro
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <h1 className="text-3xl font-bold text-secondary-900 mb-6">Dados do Candidato</h1>
              
              <Formik
                initialValues={{ name: '', email: '', phone: '', position: '' }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
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
                        placeholder="Digite o cargo para o qual está se candidatando"
                      />
                      <ErrorMessage name="position" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div className="pt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep('intro')}
                        className="btn-secondary"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary"
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
