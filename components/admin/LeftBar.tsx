import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LeftBarProps {
  activeSection: 'selecao' | 'treinamento';
}

const LeftBar: React.FC<LeftBarProps> = ({ activeSection }) => {
  const router = useRouter();
  const currentPath = router.pathname;
  
  // Função para verificar se um link está ativo
  const isActive = (href: string) => {
    return currentPath === href || 
          (href !== '/admin/dashboard' && currentPath.startsWith(href));
  };
  
  return (
    <div className="h-full w-64 bg-white shadow-md">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-primary-700 mb-4">
          {activeSection === 'selecao' ? 'Seleção' : 'Treinamento'}
        </h2>
        
        <nav className="space-y-1">
          {activeSection === 'selecao' ? (
            // Menu para a seção de Seleção
            <>
              <Link 
                href="/admin/dashboard"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/dashboard')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              
              <Link 
                href="/admin/candidates"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/candidates')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Candidatos
              </Link>
              
              <Link 
                href="/admin/processes"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/processes')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Processos Seletivos
              </Link>
              
              <Link 
                href="/admin/tests"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/tests')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Testes
              </Link>
              
              <Link 
                href="/admin/questions"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/questions')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Perguntas
              </Link>
              
              <Link 
                href="/admin/categories"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/categories')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categorias
              </Link>
            </>
          ) : (
            // Menu para a seção de Treinamento
            <>
              <Link 
                href="/admin/training/dashboard"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/dashboard')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              
              <Link 
                href="/admin/training/students"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/students')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                Alunos
              </Link>
              
              <Link 
                href="/admin/training/courses"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/courses')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Cursos
              </Link>
              
              <Link 
                href="/admin/training/modules"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/modules')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Módulos
              </Link>
              
              <Link 
                href="/admin/training/materials"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/materials')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Materiais
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default LeftBar;
