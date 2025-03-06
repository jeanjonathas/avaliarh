import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-16">
          <Image src="/images/logo_horizontal.png" alt="AvaliaRH" width={250} height={75} />
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
            <Link href="/teste/introducao" className="btn-primary inline-block text-lg">
              Iniciar Processo de Avaliação
            </Link>
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
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Cadastro</h3>
              <p className="text-secondary-600">Preencha seus dados básicos para iniciar o processo de avaliação.</p>
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
              <h3 className="text-xl font-semibold text-secondary-800 mb-2">Finalização</h3>
              <p className="text-secondary-600">Após concluir todas as etapas, seus resultados serão analisados pela nossa equipe.</p>
            </div>
          </div>
        </section>

        <footer className="text-center text-secondary-500 py-8">
          <p>&copy; {new Date().getFullYear()} AvaliaRH - Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  )
}

export default Home
