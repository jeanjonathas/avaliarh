import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex py-3 px-5 text-sm">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center text-secondary-600 hover:text-primary-600"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            <span>Início</span>
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRightIcon className="w-4 h-4 text-secondary-400 mx-1" />
            {item.isCurrent ? (
              <span className="text-primary-600 font-medium">{item.label}</span>
            ) : (
              <Link 
                href={item.href}
                className="text-secondary-600 hover:text-primary-600"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Função auxiliar para gerar automaticamente os itens de breadcrumb com base na rota atual
export const useBreadcrumbs = () => {
  const router = useRouter();
  const pathSegments = router.pathname.split('/').filter(segment => segment);
  
  // Mapeamento de segmentos de URL para nomes mais amigáveis
  const segmentLabels: Record<string, string> = {
    'admin': 'Admin',
    'training': 'Treinamento',
    'dashboard': 'Dashboard',
    'courses': 'Cursos',
    'new': 'Novo',
    'edit': 'Editar',
    'modules': 'Módulos',
    'lessons': 'Aulas',
    'materials': 'Materiais',
    'tests': 'Testes',
    'questions': 'Questões',
    'test-results': 'Resultados',
    'students': 'Alunos',
    'enrollments': 'Matrículas',
    'student-progress': 'Progresso',
    'certificates': 'Certificados',
    'reports': 'Relatórios',
    'settings': 'Configurações',
    'sectors': 'Setores'
  };
  
  // Construir os itens de breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [];
  let currentPath = '';
  
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    const isId = segment.length === 24 && /^[0-9a-f]{24}$/i.test(segment);
    
    // Se for um ID, tente obter o nome do segmento anterior
    if (isId && index > 0) {
      const entityType = pathSegments[index - 1];
      const label = `${segmentLabels[entityType] || entityType} Detalhes`;
      
      breadcrumbItems.push({
        label,
        href: currentPath,
        isCurrent: isLast
      });
    } else {
      breadcrumbItems.push({
        label: segmentLabels[segment] || segment,
        href: currentPath,
        isCurrent: isLast
      });
    }
  });
  
  return breadcrumbItems;
};

export default Breadcrumbs;
