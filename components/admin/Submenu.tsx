import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SubmenuProps {
  title: string;
  icon: React.ReactNode;
  mainLink: string;
  children: React.ReactNode;
}

const Submenu: React.FC<SubmenuProps> = ({ 
  title, 
  icon, 
  mainLink, 
  children 
}) => {
  const router = useRouter();
  const isMainActive = router.pathname.startsWith(mainLink) || 
                      router.pathname.includes(mainLink.replace('-menu', ''));
  
  // Criar um ID único para este submenu baseado no mainLink
  const submenuId = `submenu-${mainLink.replace(/\//g, '-')}`;
  
  // Inicializar o estado com base no localStorage ou na rota ativa
  const [isExpanded, setIsExpanded] = useState(() => {
    // Verificar se estamos no lado do cliente
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(submenuId);
      // Se houver um estado salvo, usá-lo; caso contrário, usar isMainActive
      return savedState !== null ? savedState === 'true' : isMainActive;
    }
    return isMainActive;
  });
  
  // Atualiza o estado de expansão quando a rota muda
  useEffect(() => {
    // Se a rota atual corresponde a este submenu, expandi-lo
    if (isMainActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isMainActive, isExpanded]);
  
  // Salvar o estado no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(submenuId, isExpanded.toString());
    }
  }, [isExpanded, submenuId]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mb-1">
      <div 
        className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
          isMainActive ? "bg-primary-50" : "hover:bg-primary-50"
        }`}
        onClick={toggleExpanded}
      >
        <div
          className={`flex-1 flex items-center text-sm font-medium ${
            isMainActive ? "text-primary-700" : "text-secondary-700 hover:text-primary-700"
          }`}
        >
          {icon}
          <span className="ml-2">{title}</span>
        </div>
        <svg 
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''} ${
            isMainActive ? "text-primary-700" : "text-secondary-500"
          }`}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default Submenu;
