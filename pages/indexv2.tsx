import type { NextPage } from 'next'
import Link from 'next/link'
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
        throw new Error(data.error || 'Erro ao validar código de convite')
      }

      // Verificar se o teste já foi concluído
      if (data.message && data.message.includes('já completou a avaliação')) {
        console.log('Teste já concluído, redirecionando para página de respostas anteriores');
        // Armazenar os dados das respostas na sessão
        sessionStorage.setItem('completedResponses', JSON.stringify(data));
        // Redirecionar para a página de visualização de respostas
        router.push(`/teste/respostas-anteriores?code=${inviteCode}`);
        return;
      }

      // Armazenar os dados do candidato na sessão
      sessionStorage.setItem('candidateData', JSON.stringify(data.candidate))
      
      // Armazenar o token de segurança na sessão
      if (data.securityToken) {
        sessionStorage.setItem('securityToken', data.securityToken)
      }
      
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
            <div className="relative w-full max-w-md h-20 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-md m-3 w-5/6 h-5/6">
                <div className="w-full h-4 bg-primary-600 rounded-md mb-2"></div>
                <div className="flex space-x-2 mb-2">
                  <div className="w-8 h-8 bg-primary-200 rounded-md"></div>
                  <div className="w-8 h-8 bg-primary-300 rounded-md"></div>
                  <div className="w-8 h-8 bg-primary-400 rounded-md"></div>
                  <div className="w-8 h-8 bg-primary-500 rounded-md"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/candidato" className="text-primary-600 hover:text-primary-800 font-medium">
              Área do Candidato
            </Link>
            <Link href="/admin/login" className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-md transition-colors">
              Acesso Empresas
            </Link>
          </div>
        </header>

        <main className="flex-grow">
          {/* Hero Section */}
          <section className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 mb-16 sm:mb-24">
            <div className="w-full md:w-1/2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary-900 mb-4 sm:mb-6 text-center md:text-left bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Revolucione seu Processo de Recrutamento e Desenvolvimento
              </h1>
              <p className="text-base sm:text-lg text-secondary-600 mb-6 sm:mb-8 text-center md:text-left">
                O AvaliaRH é a plataforma completa para departamentos de RH que desejam otimizar processos de seleção e desenvolvimento de colaboradores com análises precisas e insights valiosos.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/admin/register" className="btn-primary text-center text-lg px-6 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-medium">
                  Comece Gratuitamente
                </Link>
                <Link href="#recursos" className="text-center text-lg px-6 py-3 rounded-md border border-primary-500 text-primary-600 hover:bg-primary-50 transition-all duration-300 font-medium">
                  Conheça os Recursos
                </Link>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-80 sm:h-96 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg shadow-md m-4 w-5/6 h-5/6">
                  <div className="w-full h-8 bg-primary-600 rounded-md mb-4"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded-md mb-3"></div>
                  <div className="w-full h-24 bg-gray-100 rounded-md mb-4"></div>
                  <div className="flex space-x-2 mb-4">
                    <div className="w-1/3 h-8 bg-primary-500 rounded-md"></div>
                    <div className="w-1/3 h-8 bg-primary-400 rounded-md"></div>
                    <div className="w-1/3 h-8 bg-primary-300 rounded-md"></div>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-md mb-3"></div>
                  <div className="w-full h-16 bg-gray-100 rounded-md"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Candidate Access Section */}
          <section className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-primary-100 mb-16 sm:mb-24">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="w-full md:w-2/3">
                <h2 className="text-2xl sm:text-3xl font-bold text-secondary-800 mb-4">Área do Candidato</h2>
                <p className="text-secondary-600 mb-4">
                  Se você recebeu um convite para realizar um teste, insira seu código abaixo para iniciar o processo de avaliação.
                </p>
                {!showInviteInput ? (
                  <button 
                    onClick={() => setShowInviteInput(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Inserir Código de Convite
                  </button>
                ) : !validationSuccess ? (
                  <div className="max-w-md">
                    <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="Digite o código de 6 caracteres"
                        className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-lg tracking-widest"
                        maxLength={6}
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowInviteInput(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Verificando...' : 'Continuar'}
                        </button>
                      </div>
                    </form>
                    {error && (
                      <div className="mt-2 p-2 bg-red-50 text-red-600 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-md border border-green-100 max-w-md">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-800">Código Validado!</h3>
                        <p className="text-secondary-600">Redirecionando para o teste...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative w-full max-w-xs h-48 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-md m-3 w-5/6 h-5/6">
                    <div className="w-full h-6 bg-primary-600 rounded-md mb-3"></div>
                    <div className="flex space-x-2 mb-3">
                      <div className="w-8 h-8 bg-primary-200 rounded-md"></div>
                      <div className="w-8 h-8 bg-primary-300 rounded-md"></div>
                      <div className="w-8 h-8 bg-primary-400 rounded-md"></div>
                      <div className="w-8 h-8 bg-primary-500 rounded-md"></div>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-md mb-2"></div>
                    <div className="w-full h-4 bg-gray-200 rounded-md"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="recursos" className="mb-16 sm:mb-24">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-secondary-800 mb-8 sm:mb-12 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Recursos Poderosos para seu RH
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="card p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50 flex flex-col">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-primary-600 font-bold">🧠</div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-800 mb-2">Testes de Inteligência</h3>
                <p className="text-secondary-600 mb-4 flex-grow">
                  Avalie habilidades cognitivas, raciocínio lógico e capacidade de resolução de problemas com testes padronizados e personalizáveis.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium">Inclui análise comparativa e percentis</span>
                </div>
              </div>
              
              <div className="card p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50 flex flex-col">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-primary-600 font-bold">👥</div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-800 mb-2">Análise de Personalidade</h3>
                <p className="text-secondary-600 mb-4 flex-grow">
                  Identifique traços de personalidade e comportamento para encontrar candidatos que se alinham perfeitamente à cultura da sua empresa.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium">Compatibilidade com perfil desejado</span>
                </div>
              </div>
              
              <div className="card p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50 flex flex-col">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-primary-600 font-bold">📋</div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-800 mb-2">Testes Personalizados</h3>
                <p className="text-secondary-600 mb-4 flex-grow">
                  Crie seus próprios testes com nosso editor intuitivo, adaptando as avaliações às necessidades específicas de cada vaga.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium">Banco com mais de 1000 questões</span>
                </div>
              </div>
              
              <div className="card p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50 flex flex-col">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-primary-600 font-bold">📊</div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-800 mb-2">Dashboards e Relatórios</h3>
                <p className="text-secondary-600 mb-4 flex-grow">
                  Visualize dados de desempenho com gráficos interativos e relatórios detalhados para tomada de decisões baseada em dados.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium">Exportação em PDF e Excel</span>
                </div>
              </div>
              
              <div className="card p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50 flex flex-col">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-primary-600 font-bold">📈</div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-800 mb-2">Compatibilidade Avançada</h3>
                <p className="text-secondary-600 mb-4 flex-grow">
                  Algoritmos inteligentes que calculam a compatibilidade entre candidatos e vagas, priorizando os traços mais importantes para cada posição.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium">Recomendações personalizadas</span>
                </div>
              </div>
              
              <div className="card p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary-50 flex flex-col">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-primary-600 font-bold">📚</div>
                </div>
                <h3 className="text-xl font-semibold text-secondary-800 mb-2">Treinamento de Colaboradores</h3>
                <p className="text-secondary-600 mb-4 flex-grow">
                  Plataforma integrada para cadastrar cursos e acompanhar o progresso de aprendizado dos colaboradores, com métricas de evolução.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium">Certificados automáticos</span>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="mb-16 sm:mb-24 bg-gradient-to-r from-primary-50 to-secondary-50 p-8 rounded-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-secondary-800 mb-8">
              O que nossos clientes dizem
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary-600 font-bold">TI</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-800">Tech Innovations</h3>
                    <p className="text-sm text-secondary-500">Empresa de Tecnologia</p>
                  </div>
                </div>
                <p className="text-secondary-600 italic">
                  "O AvaliaRH transformou nosso processo de recrutamento. Conseguimos reduzir o tempo de contratação em 40% e melhorar significativamente a qualidade dos candidatos selecionados para entrevistas."
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary-600 font-bold">CS</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-800">Consultoria Sigma</h3>
                    <p className="text-sm text-secondary-500">Consultoria Empresarial</p>
                  </div>
                </div>
                <p className="text-secondary-600 italic">
                  "A análise de personalidade e compatibilidade com o perfil desejado nos ajudou a formar equipes mais equilibradas e produtivas. Os relatórios detalhados são fundamentais para nossas decisões."
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-primary-600 text-white p-8 sm:p-12 rounded-lg text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pronto para transformar seu RH?</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de empresas que já otimizaram seus processos de recrutamento e desenvolvimento com o AvaliaRH.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admin/register" className="px-6 py-3 bg-white text-primary-600 font-medium rounded-md hover:bg-gray-100 transition-colors">
                Criar Conta Gratuita
              </Link>
              <Link href="/contato" className="px-6 py-3 bg-primary-700 text-white font-medium rounded-md hover:bg-primary-800 transition-colors">
                Agendar Demonstração
              </Link>
            </div>
          </section>
        </main>

        <footer className="text-center text-secondary-600 py-6 border-t border-gray-200">
          <div className="flex justify-center space-x-6 mb-4">
            <Link href="/sobre" className="hover:text-primary-600 transition-colors">
              Sobre Nós
            </Link>
            <Link href="/blog" className="hover:text-primary-600 transition-colors">
              Blog
            </Link>
            <Link href="/contato" className="hover:text-primary-600 transition-colors">
              Contato
            </Link>
            <Link href="/termos" className="hover:text-primary-600 transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-primary-600 transition-colors">
              Privacidade
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} AvaliaRH - Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  )
}

export default Home
