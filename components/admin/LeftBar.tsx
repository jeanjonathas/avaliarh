import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Submenu from './Submenu';
import SubMenuItem from './SubMenuItem';

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
              
              {/* Avaliações (com submenu) */}
              <Submenu 
                title="Avaliações" 
                mainLink="/admin/tests"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
              >
                <SubMenuItem title="Testes" href="/admin/tests" />
                <SubMenuItem title="Questões" href="/admin/questions" />
                <SubMenuItem title="Categorias" href="/admin/categories" />
              </Submenu>
              
              <Link 
                href="/admin/settings"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/settings')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configurações
              </Link>
            </>
          ) : (
            // Menu para a seção de Treinamento com submenus
            <>
              {/* Dashboard */}
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
              
              {/* Cursos (com submenu) */}
              <Submenu 
                title="Cursos" 
                mainLink="/admin/training/courses"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                }
              >
                <SubMenuItem title="Listar Cursos" href="/admin/training/courses" />
                <SubMenuItem title="Novo Curso" href="/admin/training/courses/new" />
                <SubMenuItem title="Setores" href="/admin/training/sectors" />
              </Submenu>
              
              {/* Conteúdo (com submenu) */}
              <Submenu 
                title="Conteúdo" 
                mainLink="/admin/training/content"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                <SubMenuItem title="Módulos" href="/admin/training/modules" />
                <SubMenuItem title="Aulas" href="/admin/training/lessons" />
                <SubMenuItem title="Materiais" href="/admin/training/materials" />
              </Submenu>
              
              {/* Avaliações (com submenu) */}
              <Submenu 
                title="Avaliações" 
                mainLink="/admin/training/tests"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
              >
                <SubMenuItem title="Testes" href="/admin/training/tests" />
                <SubMenuItem title="Questões" href="/admin/training/questions" />
                <SubMenuItem title="Categorias" href="/admin/training/categories" />
                <SubMenuItem title="Resultados" href="/admin/training/test-results" />
              </Submenu>
              
              {/* Alunos (com submenu) */}
              <Submenu 
                title="Alunos" 
                mainLink="/admin/training/students"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                }
              >
                <SubMenuItem title="Listar Alunos" href="/admin/training/students" />
                <SubMenuItem title="Matrículas" href="/admin/training/enrollments" />
                <SubMenuItem title="Progresso" href="/admin/training/student-progress" />
                <SubMenuItem title="Certificados" href="/admin/training/certificates" />
              </Submenu>
              
              {/* Relatórios */}
              <Link 
                href="/admin/training/reports"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/reports')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Relatórios
              </Link>
              
              {/* Configurações */}
              <Link 
                href="/admin/training/settings"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive('/admin/training/settings')
                    ? "bg-primary-100 text-primary-700"
                    : "text-secondary-700 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configurações
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default LeftBar;
