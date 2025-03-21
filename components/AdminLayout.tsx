import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Redirecionar para login se não estiver autenticado
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

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
    router.push('/admin/login');
  };

  const isActive = (path: string) => {
    return router.pathname === path ? 'bg-primary-700' : '';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra de navegação superior */}
      <nav className="bg-primary-600 text-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-xl font-bold">
                Admitto Admin
              </Link>
            </div>
            
            {session && (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-1">
                  <span className="text-sm">{session.user?.name || 'Administrador'}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-primary-700 hover:bg-primary-800 px-3 py-1 rounded text-sm"
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
                  href="/admin/dashboard" 
                  className={`block px-4 py-2 rounded hover:bg-primary-600 transition-colors ${isActive('/admin/dashboard')}`}
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
                  href="/admin/candidates" 
                  className={`block px-4 py-2 rounded hover:bg-primary-600 transition-colors ${isActive('/admin/candidates')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>Candidatos</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/settings" 
                  className={`block px-4 py-2 rounded hover:bg-primary-600 transition-colors ${isActive('/admin/settings')}`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <span>Configurações</span>
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

export default AdminLayout;
