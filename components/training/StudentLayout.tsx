import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { 
  FiHome, 
  FiBook, 
  FiBarChart2, 
  FiAward, 
  FiClock, 
  FiUser, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiBell
} from 'react-icons/fi';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Buscar notificações
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/training/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
      }
    };

    fetchNotifications();
    // Atualizar notificações a cada 5 minutos
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Verificar se o link está ativo
  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(path + '/');
  };

  // Links de navegação
  const navLinks = [
    { name: 'Início', href: '/treinamento', icon: FiHome },
    { name: 'Meus Cursos', href: '/treinamento/cursos', icon: FiBook },
    { name: 'Meu Progresso', href: '/treinamento/progresso', icon: FiBarChart2 },
    { name: 'Certificados', href: '/treinamento/certificados', icon: FiAward },
    { name: 'Histórico', href: '/treinamento/historico', icon: FiClock },
    { name: 'Perfil', href: '/treinamento/perfil', icon: FiUser },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo e botão de menu mobile */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <button
                  type="button"
                  className="md:hidden p-2 rounded-md text-secondary-600 hover:bg-secondary-100 focus:outline-none"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <FiX className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <FiMenu className="h-6 w-6" aria-hidden="true" />
                  )}
                </button>
                <Link href="/treinamento">
                  <span className="text-xl font-bold text-primary-600 ml-2 md:ml-0">
                    Treinamento - Admitto
                  </span>
                </Link>
              </div>
            </div>

            {/* Perfil e notificações */}
            <div className="flex items-center space-x-4">
              {/* Notificações */}
              <div className="relative">
                <button
                  className="p-2 rounded-full text-secondary-600 hover:bg-secondary-100 focus:outline-none relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <FiBell className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {/* Dropdown de notificações */}
                {showNotifications && (
                  <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <div className="px-4 py-2 border-b border-secondary-200">
                        <h3 className="text-sm font-medium text-secondary-900">Notificações</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification, index) => (
                            <div
                              key={index}
                              className="px-4 py-3 hover:bg-secondary-50 border-b border-secondary-100 last:border-0"
                            >
                              <p className="text-sm font-medium text-secondary-900">{notification.title}</p>
                              <p className="text-xs text-secondary-500">{notification.message}</p>
                              <p className="text-xs text-secondary-400 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-secondary-500">
                            Nenhuma notificação no momento
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Perfil do usuário */}
              <div className="relative">
                <div className="flex items-center">
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-secondary-900">
                      {session?.user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {session?.user?.email || ''}
                    </p>
                  </div>
                  <div className="ml-2 h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
              </div>

              {/* Botão de logout */}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="p-2 rounded-full text-secondary-600 hover:bg-secondary-100 focus:outline-none"
                title="Sair"
              >
                <FiLogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu lateral mobile */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          mobileMenuOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="fixed inset-0 bg-secondary-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl">
          <div className="h-full flex flex-col">
            <div className="h-16 flex items-center justify-between px-4 border-b border-secondary-200">
              <span className="text-xl font-bold text-primary-600">Menu</span>
              <button
                type="button"
                className="p-2 rounded-md text-secondary-600 hover:bg-secondary-100 focus:outline-none"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FiX className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-4 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center px-4 py-3 text-base font-medium rounded-md ${
                    isActive(link.href)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-secondary-600 hover:bg-secondary-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive(link.href) ? 'text-primary-500' : 'text-secondary-400'
                    }`}
                  />
                  {link.name}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-secondary-200">
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center px-4 py-3 text-base font-medium text-secondary-600 hover:bg-secondary-50 rounded-md w-full"
              >
                <FiLogOut className="mr-3 h-5 w-5 text-secondary-400" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex">
            {/* Menu lateral desktop */}
            <div className="hidden md:block w-64 mr-8">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <nav className="flex-1 px-2 py-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md mb-1 ${
                        isActive(link.href)
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-secondary-600 hover:bg-secondary-50'
                      }`}
                    >
                      <link.icon
                        className={`mr-3 h-5 w-5 ${
                          isActive(link.href) ? 'text-primary-500' : 'text-secondary-400'
                        }`}
                      />
                      {link.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Conteúdo da página */}
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-secondary-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-secondary-500">
            &copy; {new Date().getFullYear()} AvaliaRH - Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
