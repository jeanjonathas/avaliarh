import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Head from 'next/head'
import { NotificationProvider } from '../contexts/NotificationContext'

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <Head>
          <title>Sistema de Avaliação de Candidatos</title>
          <meta name="description" content="Sistema de avaliação para candidatos" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} />
      </NotificationProvider>
    </SessionProvider>
  )
}

export default MyApp
