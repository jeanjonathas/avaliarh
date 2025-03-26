import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/global-tests/${req.query.id}/access`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do teste é obrigatório' });
    }

    try {
      // Verificar se o teste global existe
      const globalTest = await prisma.globalTest.findUnique({
        where: { id },
      });

      if (!globalTest) {
        return res.status(404).json({ message: 'Teste global não encontrado' });
      }

      // GET - Obter empresas com acesso ao teste
      if (req.method === 'GET') {
        const accessRecords = await prisma.globalAccess.findMany({
          where: {
            globalTestId: id,
          },
          include: {
            company: true,
          },
        });

        return res.status(200).json(accessRecords);
      }

      // PUT - Atualizar acesso das empresas ao teste
      if (req.method === 'PUT') {
        const { companyIds } = req.body;

        if (!companyIds || !Array.isArray(companyIds)) {
          return res.status(400).json({ message: 'Lista de IDs de empresas é obrigatória' });
        }

        // Obter registros de acesso existentes
        const existingAccess = await prisma.globalAccess.findMany({
          where: {
            globalTestId: id,
          },
        });

        const existingCompanyIds = existingAccess.map(access => access.companyId);

        // Identificar empresas a serem adicionadas e removidas
        const companyIdsToAdd = companyIds.filter(companyId => !existingCompanyIds.includes(companyId));
        const companyIdsToRemove = existingCompanyIds.filter(companyId => !companyIds.includes(companyId));

        // Transação para garantir consistência
        await prisma.$transaction(async (tx) => {
          // Remover acessos
          if (companyIdsToRemove.length > 0) {
            await tx.globalAccess.deleteMany({
              where: {
                globalTestId: id,
                companyId: {
                  in: companyIdsToRemove,
                },
              },
            });
          }

          // Adicionar novos acessos
          for (const companyId of companyIdsToAdd) {
            await tx.globalAccess.create({
              data: {
                company: {
                  connect: { id: companyId },
                },
                globalTest: {
                  connect: { id },
                },
              },
            });
          }
        });

        // Buscar os registros atualizados
        const updatedAccessRecords = await prisma.globalAccess.findMany({
          where: {
            globalTestId: id,
          },
          include: {
            company: true,
          },
        });

        return res.status(200).json(updatedAccessRecords);
      }

      // Método não permitido
      return res.status(405).json({ message: 'Método não permitido' });
    } catch (error) {
      console.error('Erro na API de acesso a testes globais:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Erro na API de acesso a testes globais:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
