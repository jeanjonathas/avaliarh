import React from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import SuperAdminLayout from '../../components/SuperAdminLayout';

const SettingsPage: React.FC = () => {
  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações do Sistema</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  Esta funcionalidade está em desenvolvimento e estará disponível em breve.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">
            As configurações do sistema permitirão ajustar parâmetros globais da plataforma Admitto.
          </p>
          
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Configurações planejadas:</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>Configurações de e-mail e notificações</li>
              <li>Personalização da interface e marca branca</li>
              <li>Definição de limites e quotas do sistema</li>
              <li>Configurações de segurança e privacidade</li>
              <li>Integrações com sistemas externos</li>
            </ul>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default SettingsPage;
