import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const Navbar: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  
  const currentPath = router.pathname;
  
  const NavLink: React.FC<NavLinkProps> = ({ href, children }) => {
    const isActive = currentPath === href || 
                    (href !== '/admin/dashboard' && currentPath.startsWith(href));
    
    return (
      <Link href={href} className={`px-3 py-2 font-medium ${
        isActive
          ? "text-primary-600 border-b-2 border-primary-600"
          : "text-secondary-700 hover:text-primary-600"
      }`}>
        {children}
      </Link>
    );
  };
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/admin/dashboard" className="text-xl font-bold text-primary-700">
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
          <div>
            <Link href="/api/auth/signout" className="px-4 py-2 text-sm text-white bg-secondary-600 rounded-md hover:bg-secondary-700">
              Sair
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
