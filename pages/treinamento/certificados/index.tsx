import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import { FiAward, FiClock } from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';

export default function Certificates() {
  return (
    <StudentLayout>
      <Head>
        <title>Certificados | Portal de Treinamento</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Meus Certificados</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-100 p-6 rounded-full">
              <FiAward className="text-primary-500 w-16 h-16" />
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-secondary-900 mb-3">
            Certificados em breve!
          </h2>
          
          <p className="text-secondary-600 mb-6 max-w-lg mx-auto">
            Estamos trabalhando para disponibilizar seus certificados de conclusão de cursos.
            Em breve você poderá visualizar, baixar e compartilhar seus certificados diretamente por aqui.
          </p>
          
          <div className="flex items-center justify-center text-secondary-500">
            <FiClock className="mr-2" />
            <span>Disponível em breve</span>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Verificar autenticação no servidor
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/certificados'),
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
};
