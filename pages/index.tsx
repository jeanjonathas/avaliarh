import type { NextPage } from 'next'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

interface TestData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
}

export default function Home() {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState(''); // 'success', 'error', ou ''
  const [candidate, setCandidate] = useState<any>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar se o usuário já está autenticado e redirecionar para o dashboard apropriado
  useEffect(() => {
    // Remover o redirecionamento automático para permitir que usuários logados acessem a home
    // Agora o usuário pode navegar livremente entre home e dashboard
    if (status === 'loading') return;
    
    if (session) {
      console.log('Página inicial - Usuário autenticado:', {
        role: session.user.role,
        name: session.user.name
      });
      // Não redirecionamos mais automaticamente
    }
  }, [session, status]);

  const handleInviteSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação do código de convite no frontend
    if (!inviteCode.trim()) {
      setError('Por favor, insira um código de convite válido.');
      setValidationStatus('error');
      return;
    }

    if (inviteCode.length !== 6) {
      setError('O código de convite deve ter exatamente 6 caracteres.');
      setValidationStatus('error');
      return;
    }

    setIsLoading(true);
    setError('');
    setValidationStatus('');

    try {
      const response = await fetch('/api/candidates/validate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Erro ao validar código de convite');
        setValidationStatus('error');
        setIsLoading(false);
        return;
      }

      // Verificar se o teste já foi concluído
      if (data.message && data.message.includes('já completou a avaliação')) {
        console.log('Teste já concluído, redirecionando para página de respostas anteriores');
        sessionStorage.setItem('completedResponses', JSON.stringify(data));
        setValidationStatus('success');
        setTimeout(() => {
          router.push(`/teste/respostas-anteriores?code=${inviteCode}`);
        }, 800);
        return;
      }

      // Armazenar os dados do candidato na sessão
      sessionStorage.setItem('candidateData', JSON.stringify(data.candidate));
      
      // Armazenar o token de segurança na sessão
      if (data.securityToken) {
        sessionStorage.setItem('securityToken', data.securityToken);
      }
      
      // Armazenar os dados do teste na sessão, se disponíveis
      if (data.test) {
        sessionStorage.setItem('testData', JSON.stringify(data.test));
      }
      
      // Definir o estado de sucesso e os dados do candidato
      setValidationStatus('success');
      setCandidate(data.candidate);
      setValidationSuccess(true);
      
      // Redirecionar para a página de introdução após um breve delay para mostrar o feedback visual
      setTimeout(() => {
        router.push(`/teste/introducao?code=${inviteCode}`);
      }, 800);
    } catch (error: any) {
      setError(error.message || 'Erro ao validar código de convite');
      setValidationStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [inviteCode, router]);

  return (
    <div className="min-h-screen bg-white">      
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-sky-600">
              Admitto
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="#recursos" className="text-gray-600 hover:text-sky-600 font-medium">
              Recursos
            </Link>
            <Link href="#clientes" className="text-gray-600 hover:text-sky-600 font-medium">
              Clientes
            </Link>
            <Link href="#planos" className="text-gray-600 hover:text-sky-600 font-medium">
              Planos
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <Link 
                  href={session.user.role === 'SUPER_ADMIN' ? '/superadmin/dashboard' : '/admin/dashboard'} 
                  className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-md font-medium transition-colors duration-300"
                >
                  Acessar Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/admin" 
                  className="hidden md:inline-block text-gray-700 hover:text-sky-600 font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-md font-medium transition-colors duration-300"
                >
                  Começar Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-sky-500 to-sky-700 rounded-xl mt-6 mb-12 overflow-hidden shadow-lg">
          <div className="px-6 py-16 md:py-20 flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0 text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Admitto
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-sky-100">
                A plataforma completa para avaliação e desenvolvimento de talentos
              </p>
              <ul className="mb-8 space-y-3">
                <li className="flex items-center">
                  <div className="bg-sky-400 rounded-full p-1 mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-sky-100">Testes de inteligência e personalidade</span>
                </li>
                <li className="flex items-center">
                  <div className="bg-sky-400 rounded-full p-1 mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-sky-100">Análise de compatibilidade com vagas</span>
                </li>
                <li className="flex items-center">
                  <div className="bg-sky-400 rounded-full p-1 mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-sky-100">Relatórios detalhados e insights</span>
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/register" 
                  className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-sky-900 font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 text-center"
                >
                  Experimente Grátis
                </Link>
                <Link 
                  href="/demo" 
                  className="px-6 py-3 bg-sky-600 text-white border border-sky-500 hover:bg-sky-700 font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-300 text-center"
                >
                  Agendar Demo
                </Link>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-400 rounded-full opacity-20"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-sky-400 rounded-full opacity-20"></div>
                <div className="bg-white p-6 rounded-lg shadow-lg relative z-10">
                  <div className="w-full h-[300px] rounded-md shadow-sm bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-500 text-center p-4">
                      <div className="text-2xl font-semibold mb-2">Admitto Dashboard</div>
                      <p className="text-sm">Plataforma completa para gestão de processos seletivos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>        

        {/* Área do Candidato */}
        <section className="mb-12 bg-gradient-to-r from-sky-50 to-sky-100 rounded-xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">Área do Candidato</h2>
              <p className="text-lg text-gray-700 mb-6">
                Você recebeu um código de convite para realizar uma avaliação? Insira o código abaixo para acessar seus testes.
              </p>
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Convite
                  </label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 6).toUpperCase();
                      setInviteCode(value);
                      if (error) {
                        setError('');
                        setValidationStatus('');
                      }
                    }}
                    maxLength={6}
                    className={`w-full h-20 px-4 text-center text-3xl font-bold tracking-wider border-2 ${
                      validationStatus === 'error' 
                        ? 'border-red-500 ring-1 ring-red-500 bg-red-50' 
                        : validationStatus === 'success'
                          ? 'border-green-500 ring-1 ring-green-500 bg-green-50'
                          : 'border-sky-300'
                    } rounded-md focus:outline-none focus:ring-2 ${
                      validationStatus === 'error'
                        ? 'focus:ring-red-500' 
                        : validationStatus === 'success'
                          ? 'focus:ring-green-500'
                          : 'focus:ring-sky-500'
                    } focus:border-transparent transition-colors`}
                    placeholder="CÓDIGO"
                    style={{ letterSpacing: '0.5em' }}
                  />
                  {error && validationStatus === 'error' && (
                    <div className="mt-2 flex items-center text-red-600">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  )}
                  {validationStatus === 'success' && !error && (
                    <div className="mt-2 flex items-center text-green-600">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Código válido! Redirecionando...</span>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className={`w-full py-3 px-4 ${
                    isLoading ? 'bg-gray-400' : 'bg-sky-500 hover:bg-sky-600'
                  } text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors flex justify-center items-center`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </button>
              </form>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Como funciona?</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Você recebeu um código de convite para realizar uma avaliação? Insira o código abaixo para acessar seus testes.
                </p>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex">
                    <span className="bg-sky-200 text-sky-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">1</span>
                    <p>Insira o código de convite que você recebeu por e-mail</p>
                  </li>
                  <li className="flex">
                    <span className="bg-sky-200 text-sky-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">2</span>
                    <p>Complete os testes solicitados dentro do prazo</p>
                  </li>
                  <li className="flex">
                    <span className="bg-sky-200 text-sky-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">3</span>
                    <p>Receba feedback sobre seus resultados</p>
                  </li>
                </ol>
                <div className="mt-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Dica:</span> Certifique-se de estar em um ambiente tranquilo e sem distrações para realizar os testes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className="mb-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">Recursos Completos para RH</h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Tudo o que você precisa para avaliar, selecionar e desenvolver talentos em uma única plataforma.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-sky-100">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75V19h-1v-1a3.4 3.4 0 00-1.889-3.009l-.533-.266" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Testes de Inteligência</h3>
              <p className="text-gray-700 mb-4">
                Avalie as capacidades cognitivas dos candidatos com testes validados cientificamente.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Raciocínio lógico</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Raciocínio verbal</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Raciocínio numérico</span>
                </li>
              </ul>
              <Link 
                href="/recursos/testes-inteligencia" 
                className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center"
              >
                Saiba mais
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-sky-100">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Análise de Personalidade</h3>
              <p className="text-gray-700 mb-4">
                Identifique traços de personalidade e comportamento para melhor adequação às funções.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Big Five Personality</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Perfil comportamental</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Competências socioemocionais</span>
                </li>
              </ul>
              <Link 
                href="/recursos/analise-personalidade" 
                className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center"
              >
                Saiba mais
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-sky-100">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Compatibilidade Avançada</h3>
              <p className="text-gray-700 mb-4">
                Compare candidatos com perfis ideais para cada posição e equipe.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Match com perfil da vaga</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Compatibilidade com equipe</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-gray-600">Análise preditiva de desempenho</span>
                </li>
              </ul>
              <Link 
                href="/recursos/compatibilidade" 
                className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center"
              >
                Saiba mais
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Link 
              href="/recursos" 
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 inline-flex items-center"
            >
              Ver todos os recursos
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          </div>
        </section>

        {/* Depoimentos */}
        <section id="clientes" className="mb-12 bg-gradient-to-r from-sky-100 to-sky-200 p-8 rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full opacity-20"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sky-400 rounded-full opacity-20"></div>
          
          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">O que Nossos Clientes Dizem</h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Empresas de diversos segmentos já transformaram seus processos de RH com o Admitto.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-sky-200 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-sky-700 font-bold">MS</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Maria Silva</h4>
                  <p className="text-sm text-gray-600">Diretora de RH, TechCorp</p>
                </div>
              </div>
              <p className="text-gray-700">
                O Admitto revolucionou nosso processo seletivo. Reduzimos o tempo de contratação em 40% e melhoramos significativamente a qualidade das nossas contratações.
              </p>
              <div className="mt-4 flex">
                <div className="flex text-yellow-400">
                  ★★★★★
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-sky-200 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-sky-700 font-bold">JO</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">João Oliveira</h4>
                  <p className="text-sm text-gray-600">CEO, Startup Inovadora</p>
                </div>
              </div>
              <p className="text-gray-700">
                Os insights gerados pela plataforma nos ajudaram a montar times mais equilibrados e produtivos. A análise de compatibilidade é simplesmente incrí vel.
              </p>
              <div className="mt-4 flex">
                <div className="flex text-yellow-400">
                  ★★★★★
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-sky-200 rounded-full mr-4 flex items-center justify-center">
                  <span className="text-sky-700 font-bold">AB</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Ana Beatriz</h4>
                  <p className="text-sm text-gray-600">Gerente de RH, Multinacional</p>
                </div>
              </div>
              <p className="text-gray-700">
                A facilidade de uso e a qualidade dos relatórios são impressionantes. Conseguimos identificar talentos que passariam despercebidos em processos tradicionais.
              </p>
              <div className="mt-4 flex">
                <div className="flex text-yellow-400">
                  ★★★★★
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chamada para Ação */}
        <section className="mb-12 sm:mb-20">
          <div className="bg-gradient-to-r from-sky-500 to-sky-700 p-8 rounded-xl shadow-md text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full opacity-10"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sky-400 rounded-full opacity-10"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-8">
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                  Transforme seu Processo de RH Hoje
                </h2>
                <p className="text-lg opacity-90 max-w-xl">
                  Junte-se a centenas de empresas que já estão contratando melhores talentos com o Admitto.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/planos" 
                  className="px-6 py-3 bg-white text-sky-700 hover:bg-yellow-100 font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 text-center"
                >
                  Ver planos
                </Link>
                <Link 
                  href="/contato" 
                  className="px-6 py-3 bg-sky-400 hover:bg-sky-300 text-white font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300 border border-sky-300 text-center"
                >
                  Falar com consultor
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Formulário de Contato */}
        <section id="planos" className="mb-12 sm:mb-20 flex flex-col md:flex-row gap-8 items-stretch">
          <div className="w-full md:w-1/2 bg-gradient-to-br from-sky-100 to-sky-200 p-8 rounded-xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Entre em Contato</h2>
            <p className="text-gray-700 mb-6">
              Tem dúvidas sobre como o Admitto pode ajudar sua empresa? Preencha o formulário e nossa equipe entrará em contato.
            </p>
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Corporativo
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  id="company"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Nome da sua empresa"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Como podemos ajudar?"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-300"
              >
                Enviar Mensagem
              </button>
            </form>
          </div>
          <div className="w-full md:w-1/2 bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Planos e Preços</h2>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6 hover:border-sky-300 hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Plano Starter</h3>
                    <p className="text-gray-600">Para pequenas empresas</p>
                  </div>
                  <div className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium">
                    Popular
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-800">R$ 299</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Até 50 avaliações/mês
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Testes de inteligência
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Análise de personalidade
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Relatórios básicos
                  </li>
                </ul>
                <button className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-300">
                  Começar Agora
                </button>
              </div>
              
              <div className="border border-sky-300 rounded-lg p-6 shadow-md relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-sky-900 px-4 py-1 rounded-full text-sm font-bold">
                  Mais Vendido
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Plano Business</h3>
                    <p className="text-gray-600">Para empresas em crescimento</p>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-800">R$ 599</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Até 200 avaliações/mês
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Todos os tipos de testes
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Compatibilidade avançada
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Relatórios detalhados
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span> Suporte prioritário
                  </li>
                </ul>
                <button className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-300">
                  Escolher Plano
                </button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Rodapé */}
        <footer className="pt-10 pb-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Admitto </h3>
              <p className="text-gray-600 text-sm mb-4">
                Transformando a forma como as empresas avaliam e selecionam talentos.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-500 hover:text-sky-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-sky-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-sky-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-500 hover:text-sky-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd"></path>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Recursos</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/recursos/testes-inteligencia" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Testes de Inteligência
                  </Link>
                </li>
                <li>
                  <Link href="/recursos/analise-personalidade" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Análise de Personalidade
                  </Link>
                </li>
                <li>
                  <Link href="/recursos/compatibilidade" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Compatibilidade
                  </Link>
                </li>
                <li>
                  <Link href="/recursos/relatorios" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Relatórios e Dashboards
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Empresa</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/sobre" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Sobre Nós
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/clientes" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Casos de Sucesso
                  </Link>
                </li>
                <li>
                  <Link href="/carreiras" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Carreiras
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Suporte</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/contato" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Contato
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Perguntas Frequentes
                  </Link>
                </li>
                <li>
                  <Link href="/documentacao" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Documentação
                  </Link>
                </li>
                <li>
                  <Link href="/privacidade" className="text-gray-600 hover:text-sky-600 transition-colors">
                    Política de Privacidade
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Admitto. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6">
              <Link href="/termos" className="text-gray-600 hover:text-sky-600 transition-colors text-sm">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="text-gray-600 hover:text-sky-600 transition-colors text-sm">
                Privacidade
              </Link>
              <Link href="/cookies" className="text-gray-600 hover:text-sky-600 transition-colors text-sm">
                Cookies
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
