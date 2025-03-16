import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Redirecionar para login se não estiver autenticado
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login');
    } else if (status === 'authenticated' && (session?.user?.role as string) !== 'SUPER_ADMIN') {
      // Redirecionar para dashboard normal se não for SUPER_ADMIN
      router.push('/admin/dashboard');
    }
  }, [status, router, session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/superadmin/login');
  };

  const isActive = (path: string) => {
    return router.pathname === path ? 'bg-primary-700' : '';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra de navegação superior */}
      <nav className="bg-purple-800 text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-4">
              <Link href="/superadmin/dashboard" className="text-xl font-bold">
                AvaliaRH Super Admin
              </Link>
            </div>
            
            {session && (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-1">
                  <span className="text-sm">{session.user?.name || 'Super Administrador'}</span>
                  <span className="bg-purple-700 text-xs px-2 py-1 rounded-full">SUPER ADMIN</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-purple-900 hover:bg-purple-950 px-3 py-1 rounded text-sm"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <div className="flex">
        {/* Barra lateral */}
        <aside className="w-64 bg-gray-800 text-white min-h-screen hidden md:block">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/superadmin/dashboard" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/dashboard')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/companies" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/companies')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
                    </svg>
                    <span>Empresas</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/users" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/users')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>Usuários</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/stages" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/stages')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 3a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
                    </svg>
                    <span>Etapas</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/settings" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/settings')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <span>Configurações</span>
                  </div>
                </Link>
              </li>
              
              {/* Seção de Testes Globais */}
              <li className="pt-4">
                <div className="px-4 text-xs text-gray-400 uppercase font-semibold">Testes Globais</div>
              </li>
              <li>
                <Link 
                  href="/superadmin/categories" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/categories')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    <span>Categorias</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/globalcategories" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/globalcategories')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                    </svg>
                    <span>Categorias Globais</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/questions" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/questions')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>Perguntas</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/global-tests" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/global-tests')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>Testes</span>
                  </div>
                </Link>
              </li>
              
              {/* Seção de Planos e Assinaturas */}
              <li className="pt-4">
                <div className="px-4 text-xs text-gray-400 uppercase font-semibold">Planos e Assinaturas</div>
              </li>
              <li>
                <Link 
                  href="/superadmin/plans" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/plans')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
                    </svg>
                    <span>Planos</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/superadmin/subscriptions" 
                  className={`block px-4 py-2 rounded hover:bg-purple-700 transition-colors ${isActive('/superadmin/subscriptions')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>Assinaturas</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </aside>
        
        {/* Conteúdo principal */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
