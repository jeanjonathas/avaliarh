import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Navbar from './Navbar';
import LeftBar from './LeftBar';

interface PersistentLayoutProps {
  children: React.ReactNode;
}

const PersistentLayout: React.FC<PersistentLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeSection, setActiveSection] = useState<'selecao' | 'treinamento'>('selecao');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (router.pathname.includes('/admin/training')) {
      setActiveSection('treinamento');
    } else {
      setActiveSection('selecao');
    }
  }, [router.pathname]);
  
  const handleSectionChange = (section: 'selecao' | 'treinamento') => {
    setActiveSection(section);
    
    // Removido o redirecionamento automático para evitar looping
    // O redirecionamento deve ser feito no componente Navbar, não aqui
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onSectionChange={handleSectionChange} />
      
      <div className="flex flex-1">
        <LeftBar activeSection={activeSection} />
        
        <div className="flex-1 bg-gray-50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PersistentLayout;
