import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useSession, signOut } from 'next-auth/react'
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Head from 'next/head';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiSave, 
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';

// Componentes
import StudentLayout from '../../../components/training/StudentLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface ProfileProps {
  initialUserData: {
    id: string;
    name: string;
    email: string;
  };
}

export default function Profile({ initialUserData }: ProfileProps) {
  const { data: session, update } = useSession();
  const [userData, setUserData] = useState(initialUserData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Estados para formulário de email
  const [email, setEmail] = useState(initialUserData.email);
  const [isEmailFormVisible, setIsEmailFormVisible] = useState(false);
  
  // Estados para formulário de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false);

  // Atualizar email
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email === userData.email) {
      setMessage({ type: 'error', text: 'O email é o mesmo que o atual.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/training/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Email atualizado com sucesso!' });
        setUserData({ ...userData, email });
        
        // Atualizar a sessão
        await update({
          ...session,
          user: {
            ...session?.user,
            email,
          },
        });
        
        setIsEmailFormVisible(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro ao atualizar email.' });
      }
    } catch (error) {
      console.error('Erro ao atualizar email:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar email. Tente novamente mais tarde.' });
    } finally {
      setLoading(false);
    }
  };

  // Atualizar senha
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/training/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsPasswordFormVisible(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro ao atualizar senha.' });
      }
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar senha. Tente novamente mais tarde.' });
    } finally {
      setLoading(false);
    }
  };

  // Limpar mensagem após 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <StudentLayout>
      <Head>
        <title>Meu Perfil | Portal de Treinamento</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Meu Perfil</h1>
        
        {message && (
          <div 
            className={`mb-6 p-4 rounded-md flex items-start ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <FiCheckCircle className="mt-0.5 mr-2 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Cabeçalho do perfil */}
          <div className="bg-primary-500 p-6 text-white">
            <div className="flex items-center">
              <div className="h-20 w-20 rounded-full bg-white text-primary-500 flex items-center justify-center text-3xl font-bold mr-4">
                {userData.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{userData.name}</h2>
                <p className="text-primary-100">{userData.email}</p>
              </div>
            </div>
          </div>
          
          {/* Conteúdo do perfil */}
          <div className="p-6">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center">
                  <FiMail className="mr-2" />
                  Email
                </h3>
                <button
                  onClick={() => setIsEmailFormVisible(!isEmailFormVisible)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {isEmailFormVisible ? 'Cancelar' : 'Alterar'}
                </button>
              </div>
              
              {isEmailFormVisible ? (
                <form onSubmit={handleEmailUpdate} className="bg-secondary-50 p-4 rounded-md">
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                      Novo Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <LoadingSpinner size={16} className="mr-2" />
                      ) : (
                        <FiSave className="mr-2" />
                      )}
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-secondary-600">{userData.email}</p>
              )}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center">
                  <FiLock className="mr-2" />
                  Senha
                </h3>
                <button
                  onClick={() => setIsPasswordFormVisible(!isPasswordFormVisible)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {isPasswordFormVisible ? 'Cancelar' : 'Alterar'}
                </button>
              </div>
              
              {isPasswordFormVisible ? (
                <form onSubmit={handlePasswordUpdate} className="bg-secondary-50 p-4 rounded-md">
                  <div className="mb-4">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <LoadingSpinner size={16} className="mr-2" />
                      ) : (
                        <FiSave className="mr-2" />
                      )}
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-secondary-600">••••••••</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Verificar autenticação no servidor
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: '/treinamento/login?callbackUrl=' + encodeURIComponent('/treinamento/perfil'),
        permanent: false,
      },
    };
  }
  
  // Extrair dados do usuário da sessão
  const userData = {
    id: session.user.id || '',
    name: session.user.name || '',
    email: session.user.email || '',
  };
  
  return {
    props: {
      initialUserData: userData,
    },
  };
};
