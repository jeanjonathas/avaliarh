import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';

// Esta página redireciona automaticamente para o primeiro item do submenu de Conteúdo
export default function ContentRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirecionar para a página de módulos (primeiro item do submenu)
    router.replace('/admin/training/modules');
  }, [router]);

  return (
    <AdminLayout activeSection="treinamento">
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Redirecionando...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
