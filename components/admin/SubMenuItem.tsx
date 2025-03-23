import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SubMenuItemProps {
  title: string;
  href: string;
}

const SubMenuItem: React.FC<SubMenuItemProps> = ({ title, href }) => {
  const router = useRouter();
  
  // Verificação mais precisa para determinar se o item está ativo
  // Agora verifica se o caminho é exatamente igual ao href ou se é um subitem direto
  // com verificação adicional para evitar correspondências parciais de URLs
  const isActive = router.pathname === href || 
                  (router.pathname.startsWith(href + '/') && 
                   !router.pathname.replace(href + '/', '').includes('/'));

  return (
    <Link
      href={href}
      className={`block py-1.5 px-2 text-sm rounded-md ${
        isActive
          ? 'bg-primary-50 text-primary-700 font-medium'
          : 'text-secondary-700 hover:bg-primary-50 hover:text-primary-600'
      }`}
    >
      {title}
    </Link>
  );
};

export default SubMenuItem;
