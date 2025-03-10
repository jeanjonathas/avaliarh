import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const Navbar: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const currentPath = router.pathname;
  
  const NavLink: React.FC<NavLinkProps> = ({ href, children }) => {
    const isActive = currentPath === href || 
                    (href !== '/admin/dashboard' && currentPath.startsWith(href));
    
    return (
      <Link 
        href={href}
        className={`px-3 py-2 font-medium cursor-pointer inline-block transition-colors duration-200 ${
          isActive
            ? "text-primary-600 border-b-2 border-primary-600"
            : "text-secondary-700 hover:text-primary-600"
        }`}
      >
        {children}
      </Link>
    );
  };
  
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Adicionar um estado de carregamento para feedback visual
    const logoutButton = e.currentTarget as HTMLButtonElement;
    logoutButton.disabled = true;
    logoutButton.innerText = 'Saindo...';
    await signOut({ callbackUrl: '/' });
  };
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link 
              href="/admin/dashboard"
              className="text-xl font-bold text-primary-700"
            >
              <Image 
                src="/images/logo_horizontal.png"
                alt="AvaliaRH Logo"
                width={150}
                height={45}
                priority
              />
            </Link>
            <div className="hidden md:flex space-x-4">
              <NavLink href="/admin/dashboard">Dashboard</NavLink>
              <NavLink href="/admin/candidates">Candidatos</NavLink>
              <NavLink href="/admin/tests">Testes</NavLink>
              <NavLink href="/admin/questions">Perguntas</NavLink>
              <NavLink href="/admin/categories">Categorias</NavLink>
            </div>
          </div>
          
          {/* Menu para desktop */}
          <div className="hidden md:block">
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-white bg-secondary-600 rounded-md hover:bg-secondary-700 cursor-pointer"
            >
              Sair
            </button>
          </div>
          
          {/* Botão do menu sanduíche para mobile */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-secondary-700 hover:text-primary-600 focus:outline-none"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Menu mobile */}
        <div className={`md:hidden mt-4 pb-2 border-t border-gray-200 transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="flex flex-col pt-2 space-y-1">
            <NavLink href="/admin/dashboard">Dashboard</NavLink>
            <NavLink href="/admin/candidates">Candidatos</NavLink>
            <NavLink href="/admin/tests">Testes</NavLink>
            <NavLink href="/admin/questions">Perguntas</NavLink>
            <NavLink href="/admin/categories">Categorias</NavLink>
            <button 
              onClick={handleLogout}
              className="mt-2 px-3 py-2 text-sm text-left text-white bg-secondary-600 rounded-md hover:bg-secondary-700 cursor-pointer transition-colors duration-200"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
