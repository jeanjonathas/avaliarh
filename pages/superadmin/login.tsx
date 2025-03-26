import React, { useState, useEffect } from 'react';
import { signIn, useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import versionInfo from '@/src/version';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Função para normalizar a URL de callback
  const normalizeCallbackUrl = (url: string | null | undefined): string => {
    if (!url) return '/superadmin/dashboard';
    
    try {
      // Se a URL for relativa, retorne-a como está
      if (url.startsWith('/')) return url;
      
      // Se for uma URL absoluta, extraia apenas o caminho
      const urlObj = new URL(url);
      
      // Verificar se o domínio é diferente do atual
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        if (urlObj.hostname !== currentHost) {
          console.log(`SuperAdmin - Normalizando URL de callback: ${url} -> ${urlObj.pathname}`);
          return urlObj.pathname;
        }
      }
      
      return url;
    } catch (e) {
      console.error('SuperAdmin - Erro ao normalizar URL de callback:', e);
      return '/superadmin/dashboard';
    }
  };
  
  // Obter a URL de callback da query
  const callbackUrl = normalizeCallbackUrl(
    Array.isArray(router.query.callbackUrl) 
      ? router.query.callbackUrl[0] 
      : router.query.callbackUrl
  );
  
  // Verificar se o usuário já está autenticado
  useEffect(() => {
    if (status === 'loading') return;
    
    if (session) {
      console.log('SuperAdmin - Usuário já autenticado:', {
        role: session.user.role,
        callbackUrl
      });
      
      // Verificar se o usuário é um superadmin
      if (session.user.role !== 'SUPER_ADMIN') {
        console.log('SuperAdmin - Usuário não é SUPER_ADMIN, permanecendo na página de login');
        setError('Acesso restrito a Super Administradores.');
        return;
      }
      
      // Redirecionar para a URL de callback ou dashboard
      console.log('SuperAdmin - Redirecionando para:', callbackUrl);
      
      // Usar window.location para evitar problemas com o Next.js router
      if (typeof window !== 'undefined') {
        window.location.href = callbackUrl;
      }
    }
  }, [session, status, callbackUrl]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('SuperAdmin - Iniciando login para:', email);
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      if (result?.error) {
        console.error('SuperAdmin - Erro no login:', result.error);
        setError('Credenciais inválidas. Por favor, tente novamente.');
        setIsLoading(false);
        return;
      }
      
      if (result?.ok) {
        console.log('SuperAdmin - Login bem-sucedido, verificando papel do usuário...');
        
        // Recarregar a página para que o useEffect acima verifique a sessão
        // Isso garantirá que verificamos se o usuário é realmente um SUPER_ADMIN
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('SuperAdmin - Erro ao fazer login:', error);
      setError('Ocorreu um erro ao processar o login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Se estiver carregando a sessão, mostre uma mensagem de carregamento
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Carregando...</h2>
            <p className="text-gray-600">Verificando sua sessão</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Super Admin Login | Admitto</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Login Super Administrador</h2>
            <p className="text-gray-600">Acesso restrito a Super Administradores</p>
            <p className="text-xs text-gray-400 mt-2">Versão: {versionInfo.commitHash} ({versionInfo.commitDate})</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg text-white font-medium ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  // Se já estiver autenticado e for um SUPER_ADMIN, redireciona para o dashboard
  if (session && (session.user.role as string) === 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/superadmin/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
