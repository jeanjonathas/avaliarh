import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

interface NavigationLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface ContextualNavigationProps {
  prevLink?: NavigationLink;
  nextLink?: NavigationLink;
  relatedLinks?: NavigationLink[];
}

const ContextualNavigation: React.FC<ContextualNavigationProps> = ({
  prevLink,
  nextLink,
  relatedLinks = []
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center">
        {/* Link anterior */}
        <div>
          {prevLink && (
            <Link
              href={prevLink.href}
              className="flex items-center text-sm font-medium text-secondary-700 hover:text-primary-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              {prevLink.label}
            </Link>
          )}
        </div>

        {/* Links relacionados */}
        {relatedLinks.length > 0 && (
          <div className="flex space-x-4">
            {relatedLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-sm font-medium text-secondary-700 hover:text-primary-600 transition-colors"
              >
                <span className="flex items-center">
                  {link.icon}
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Próximo link */}
        <div>
          {nextLink && (
            <Link
              href={nextLink.href}
              className="flex items-center text-sm font-medium text-secondary-700 hover:text-primary-600 transition-colors"
            >
              {nextLink.label}
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// Função auxiliar para gerar links contextuais com base na rota atual
export const useContextualNavigation = () => {
  const router = useRouter();
  const path = router.pathname;
  const id = router.query.id as string;

  // Mapeamento de rotas para navegação contextual
  const navigationMap: Record<string, {
    prev?: NavigationLink;
    next?: NavigationLink;
    related: NavigationLink[];
  }> = {
    // Dashboard
    '/admin/training/dashboard': {
      next: { label: 'Ver Cursos', href: '/admin/training/courses' },
      related: [
        { label: 'Novo Curso', href: '/admin/training/courses/new' },
        { label: 'Relatórios', href: '/admin/training/reports' }
      ]
    },
    
    // Cursos
    '/admin/training/courses': {
      prev: { label: 'Dashboard', href: '/admin/training/dashboard' },
      next: { label: 'Novo Curso', href: '/admin/training/courses/new' },
      related: [
        { label: 'Setores', href: '/admin/training/sectors' },
        { label: 'Alunos', href: '/admin/training/students' }
      ]
    },
    
    // Novo Curso
    '/admin/training/courses/new': {
      prev: { label: 'Listar Cursos', href: '/admin/training/courses' },
      related: [
        { label: 'Setores', href: '/admin/training/sectors' },
        { label: 'Módulos', href: '/admin/training/modules' }
      ]
    },
    
    // Detalhes do Curso
    '/admin/training/courses/[id]': {
      prev: { label: 'Listar Cursos', href: '/admin/training/courses' },
      related: [
        { label: 'Editar Curso', href: `/admin/training/courses/${id}/edit` },
        { label: 'Módulos', href: `/admin/training/courses/${id}/modules` },
        { label: 'Alunos Matriculados', href: `/admin/training/courses/${id}/students` }
      ]
    },
    
    // Módulos
    '/admin/training/modules': {
      prev: { label: 'Cursos', href: '/admin/training/courses' },
      next: { label: 'Aulas', href: '/admin/training/lessons' },
      related: [
        { label: 'Materiais', href: '/admin/training/materials' }
      ]
    },
    
    // Aulas
    '/admin/training/lessons': {
      prev: { label: 'Módulos', href: '/admin/training/modules' },
      next: { label: 'Materiais', href: '/admin/training/materials' },
      related: [
        { label: 'Testes', href: '/admin/training/tests' }
      ]
    },
    
    // Testes
    '/admin/training/tests': {
      prev: { label: 'Aulas', href: '/admin/training/lessons' },
      related: [
        { label: 'Questões', href: '/admin/training/questions' },
        { label: 'Resultados', href: '/admin/training/test-results' }
      ]
    },
    
    // Alunos
    '/admin/training/students': {
      prev: { label: 'Dashboard', href: '/admin/training/dashboard' },
      related: [
        { label: 'Matrículas', href: '/admin/training/enrollments' },
        { label: 'Progresso', href: '/admin/training/student-progress' },
        { label: 'Certificados', href: '/admin/training/certificates' }
      ]
    },
    
    // Certificados
    '/admin/training/certificates': {
      prev: { label: 'Alunos', href: '/admin/training/students' },
      related: [
        { label: 'Matrículas', href: '/admin/training/enrollments' },
        { label: 'Progresso', href: '/admin/training/student-progress' },
        { label: 'Relatórios', href: '/admin/training/reports' }
      ]
    },
    
    // Progresso dos Alunos
    '/admin/training/student-progress': {
      prev: { label: 'Alunos', href: '/admin/training/students' },
      related: [
        { label: 'Matrículas', href: '/admin/training/enrollments' },
        { label: 'Certificados', href: '/admin/training/certificates' },
        { label: 'Relatórios', href: '/admin/training/reports' }
      ]
    },
    
    // Matrículas
    '/admin/training/enrollments': {
      prev: { label: 'Alunos', href: '/admin/training/students' },
      related: [
        { label: 'Progresso', href: '/admin/training/student-progress' },
        { label: 'Certificados', href: '/admin/training/certificates' }
      ]
    },
    
    // Configurações de Treinamento
    '/admin/training/settings': {
      prev: { label: 'Dashboard', href: '/admin/training/dashboard' },
      related: [
        { label: 'Cursos', href: '/admin/training/courses' },
        { label: 'Alunos', href: '/admin/training/students' },
        { label: 'Relatórios', href: '/admin/training/reports' }
      ]
    }
  };

  // Retornar links contextuais para a rota atual
  return navigationMap[path] || {
    prev: { label: 'Voltar', href: '/admin/training/dashboard' },
    related: []
  };
};

export default ContextualNavigation;
