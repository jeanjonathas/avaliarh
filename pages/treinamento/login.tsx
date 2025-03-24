import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiUser, FiLock, FiAlertCircle, FiArrowRight } from 'react-icons/fi';

export default function TrainingLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { callbackUrl } = router.query;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      if (result?.error) {
        setError('Credenciais inválidas. Por favor, verifique seu e-mail e senha.');
        setLoading(false);
        return;
      }
      
      // Redirecionar para a página de treinamento ou callback URL
      const redirectUrl = callbackUrl 
        ? Array.isArray(callbackUrl) 
          ? callbackUrl[0] 
          : callbackUrl 
        : '/treinamento';
      
      router.push(redirectUrl);
    } catch (error) {
      setError('Ocorreu um erro ao fazer login. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col justify-center">
      <Head>
        <title>Login - Portal de Treinamento | AvaliaRH</title>
      </Head>
      
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-block">
              <Image 
                src="/logo.png" 
                alt="AvaliaRH Logo" 
                width={180} 
                height={60} 
                className="mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/180x60?text=AvaliaRH";
                }}
              />
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-secondary-900 mt-6 mb-2">Portal de Treinamento</h2>
          <p className="text-secondary-600">Faça login para acessar seus cursos</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="text-secondary-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-secondary-900"
                  placeholder="seu.email@empresa.com"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-secondary-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-secondary-900"
                  placeholder="••••••••"
                />
              </div>
              <div className="mt-1 text-right">
                <Link href="/recuperar-senha" className="text-sm text-primary-600 hover:text-primary-700">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <FiArrowRight className="ml-2" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-secondary-600">
            Não tem uma conta?{' '}
            <Link href="/contato" className="font-medium text-primary-600 hover:text-primary-700">
              Entre em contato
            </Link>
          </p>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-secondary-500 pb-6">
        <p>&copy; {new Date().getFullYear()} AvaliaRH. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

// Verificar se o usuário já está autenticado
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  // Se já estiver autenticado, redirecionar para a página de treinamento
  if (session) {
    return {
      redirect: {
        destination: '/treinamento',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}
