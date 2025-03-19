import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Head from 'next/head'
import { NotificationProvider } from '../contexts/NotificationContext'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Função para lidar com o início do carregamento da rota
    const handleStart = (url: string) => {
      // Só mostrar o indicador de carregamento se a navegação não for para a mesma página
      if (url !== router.asPath) {
        setLoading(true);
      }
    };

    // Função para lidar com o fim do carregamento da rota
    const handleComplete = () => {
      setLoading(false);
    };

    // Registrar os eventos do router
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      // Limpar os event listeners quando o componente for desmontado
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <Head>
          <title>Sistema de Avaliação de Candidatos</title>
          <meta name="description" content="Sistema de avaliação para candidatos" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        {/* Toaster para notificações toast */}
        <Toaster
          position="bottom-center"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Define o estilo padrão
            className: '',
            duration: 3000,
            style: {
              background: '#fff',
              color: '#333',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
              fontSize: '16px',
              maxWidth: '500px',
              textAlign: 'center',
            },
            // Estilos específicos para cada tipo de toast
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
              style: {
                background: '#ECFDF5',
                border: '1px solid #10B981',
                color: '#065F46',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
              style: {
                background: '#FEF2F2',
                border: '1px solid #EF4444',
                color: '#991B1B',
              },
            },
          }}
        />
        
        {/* Indicador de carregamento global */}
        {loading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-primary-100 z-50">
            <div className="h-full bg-primary-600 animate-loading-bar"></div>
          </div>
        )}
        
        <div className={loading ? 'opacity-70 transition-opacity duration-300' : 'transition-opacity duration-300'}>
          <Component {...pageProps} />
        </div>
      </NotificationProvider>
    </SessionProvider>
  )
}

export default MyApp