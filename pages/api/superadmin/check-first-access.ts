import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * API para verificar se é o primeiro acesso ao sistema
 * Retorna true se não houver nenhum superadmin cadastrado
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[CHECK-FIRST-ACCESS] Verificando se existe algum superadmin...');
    
    // Verificar se existe algum usuário com papel SUPER_ADMIN
    const superAdminCount = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN'
      }
    });
    
    console.log(`[CHECK-FIRST-ACCESS] Superadmins encontrados: ${superAdminCount}`);
    
    // Retornar true se não houver nenhum superadmin
    return res.status(200).json({ 
      isFirstAccess: superAdminCount === 0,
      superAdminCount
    });
  } catch (error) {
    console.error('[CHECK-FIRST-ACCESS] Erro ao verificar primeiro acesso:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar primeiro acesso',
      isFirstAccess: false
    });
  }
}
