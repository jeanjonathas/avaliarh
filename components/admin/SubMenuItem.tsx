import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SubMenuItemProps {
  title: string;
  href: string;
}

const SubMenuItem: React.FC<SubMenuItemProps> = ({ title, href }) => {
  const router = useRouter();
  const isActive = router.pathname === href || router.pathname.startsWith(href + '/');

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
