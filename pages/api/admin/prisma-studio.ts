import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { exec } from 'child_process';

// IMPORTANTE: Este endpoint só deve ser usado temporariamente para debugging
// Remova-o antes de fazer deploy para produção ou proteja-o adequadamente

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar autenticação e permissão de superadmin
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      // Verificar token de segurança adicional
      const { token } = req.query;
      const securityToken = process.env.PRISMA_STUDIO_SECRET;
      
      if (!token || token !== securityToken) {
        return res.status(401).json({ 
          message: 'Token de segurança inválido',
          info: 'Adicione ?token=SEU_TOKEN_SECRETO à URL'
        });
      }
    }
    
    // Iniciar o Prisma Studio em uma porta específica
    const port = 5555;
    exec(`npx prisma studio --port ${port}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao iniciar Prisma Studio: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao iniciar Prisma Studio', error: error.message });
      }
      
      console.log(`Prisma Studio iniciado na porta ${port}`);
      console.log(stdout);
      
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
    });
    
    return res.status(200).json({ 
      message: 'Prisma Studio iniciado',
      instructions: `
        1. O Prisma Studio está rodando na porta 5555 do servidor
        2. Configure um túnel SSH para acessá-lo:
           ssh -L 5555:localhost:5555 usuario@seu-servidor-producao
        3. Acesse http://localhost:5555 no seu navegador local
        4. IMPORTANTE: Encerre o Prisma Studio quando terminar para liberar recursos
      `
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
