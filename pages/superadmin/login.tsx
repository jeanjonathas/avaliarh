import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { callbackUrl } = router.query;

  // Verificar se o usuário já está autenticado
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('SuperAdmin Login - Verificando sessão existente...');
        const session = await getSession();
        
        if (session) {
          console.log('SuperAdmin Login - Sessão encontrada:', {
            role: session.user.role,
            name: session.user.name,
            callbackUrl: callbackUrl || 'não especificado'
          });
          
          // Verificar se o usuário é um superadmin
          if (session.user.role !== 'SUPER_ADMIN') {
            console.log('SuperAdmin Login - Usuário não é SUPER_ADMIN, permanecendo na página de login');
            return;
          }
          
          // Se houver uma URL de callback, redirecionar para ela
          if (callbackUrl && typeof callbackUrl === 'string') {
            console.log('SuperAdmin Login - Redirecionando para URL de callback:', callbackUrl);
            window.location.replace(callbackUrl);
            return;
          }
          
          // Caso contrário, redirecionar para o dashboard
          console.log('SuperAdmin Login - Redirecionando para dashboard de superadmin');
          window.location.replace('/superadmin/dashboard');
        } else {
          console.log('SuperAdmin Login - Nenhuma sessão encontrada, mostrando formulário de login');
        }
      } catch (error) {
        console.error('SuperAdmin Login - Erro ao verificar sessão:', error);
      }
    };
    
    checkSession();
  }, [router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('SuperAdmin Login - Iniciando login para:', email);
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        console.error('SuperAdmin Login - Erro no login:', result.error);
        setError('Credenciais inválidas. Por favor, tente novamente.');
      } else {
        console.log('SuperAdmin Login - Login bem-sucedido, obtendo sessão...');
        // Verificar se o usuário é um superadmin após o login
        const session = await getSession();
        
        if (!session) {
          console.error('SuperAdmin Login - Sessão não encontrada após login');
          setError('Erro ao obter sessão. Tente novamente.');
          setIsLoading(false);
          return;
        }
        
        if (session.user.role !== 'SUPER_ADMIN') {
          console.error('SuperAdmin Login - Usuário não é SUPER_ADMIN, negando acesso');
          setError('Acesso restrito a Super Administradores.');
          // Fazer logout se não for um superadmin
          await signIn('credentials', {
            redirect: false,
            email: '',
            password: '',
          });
        } else {
          console.log('SuperAdmin Login - Usuário é SUPER_ADMIN, redirecionando...');
          
          // Se houver uma URL de callback, redirecionar para ela
          if (callbackUrl && typeof callbackUrl === 'string') {
            console.log('SuperAdmin Login - Redirecionando para URL de callback após login:', callbackUrl);
            window.location.replace(callbackUrl);
            return;
          }
          
          // Forçar redirecionamento para o dashboard de superadmin
          console.log('SuperAdmin Login - Redirecionando para dashboard');
          window.location.replace('/superadmin/dashboard');
        }
      }
    } catch (err) {
      console.error('SuperAdmin Login - Erro inesperado:', err);
      setError('Ocorreu um erro durante o login. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Super Admin Login | Admitto</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-32 h-32 relative">
              <Image 
                src="/logo.png" 
                alt="Admitto Logo" 
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Acesso Super Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Área restrita para administradores do sistema
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Entrar'}
                </button>
              </div>
            </form>
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
