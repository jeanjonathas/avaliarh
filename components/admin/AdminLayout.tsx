import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import LeftBar from './LeftBar';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection?: 'selecao' | 'treinamento';
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeSection: propActiveSection }) => {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'selecao' | 'treinamento'>(propActiveSection || 'selecao');
  
  // Detectar a seção ativa com base na URL atual ao montar o componente
  useEffect(() => {
    if (propActiveSection) {
      setActiveSection(propActiveSection);
    } else if (router.pathname.includes('/admin/training')) {
      setActiveSection('treinamento');
    } else {
      setActiveSection('selecao');
    }
  }, [router.pathname, propActiveSection]);
  
  // Função para atualizar a seção ativa quando o usuário clica em uma opção no Navbar
  const handleSectionChange = (section: 'selecao' | 'treinamento') => {
    setActiveSection(section);
  };
  
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

export default AdminLayout;
