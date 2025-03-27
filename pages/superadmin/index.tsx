import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Esta página redireciona para o dashboard do superadmin
export default function SuperAdminIndex() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/superadmin/dashboard');
  }, [router]);

  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
