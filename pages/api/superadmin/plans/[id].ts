import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/plans/${req.query.id}`);
    
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
      return res.status(400).json({ message: 'ID do plano é obrigatório' });
    }

    // GET - Obter detalhes de um plano específico
    if (req.method === 'GET') {
    // Garantir que a conexão com o banco de dados esteja ativa
    await reconnectPrisma();
      const plan = await prisma.plan.findUnique({
        where: { id },
        include: {
          features: {
            include: {
              feature: true,
            },
          },
          companies: {
            include: {
              subscription: true,
            },
          },
        },
      });

      if (!plan) {
        return res.status(404).json({ message: 'Plano não encontrado' });
      }

      // Formatar a resposta
      const response = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        isActive: plan.isActive,
        features: plan.features.map(pf => ({
          id: pf.feature.id,
          name: pf.feature.name,
          description: pf.feature.description,
          isIncluded: true,
        })),
        companies: plan.companies.map(company => ({
          id: company.id,
          name: company.name,
          isActive: company.isActive,
          subscriptionStatus: company.subscription?.status || 'PENDING',
          subscriptionEndDate: company.subscription?.endDate || null,
        })),
        companiesCount: plan.companies.length,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      };

      
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
    return res.status(200).json(response);
    }

    // PUT - Atualizar um plano
    if (req.method === 'PUT') {
      const { name, description, price, isActive } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ message: 'Nome e preço são obrigatórios' });
      }

      // Verificar se o plano existe
      const existingPlan = await prisma.plan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        return res.status(404).json({ message: 'Plano não encontrado' });
      }

      // Atualizar o plano
      const updatedPlan = await prisma.plan.update({
        where: { id },
        data: {
          name,
          description: description || null,
          price: parseFloat(price.toString()),
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          features: {
            include: {
              feature: true,
            },
          },
          companies: true,
        },
      });

      // Formatar a resposta
      const response = {
        id: updatedPlan.id,
        name: updatedPlan.name,
        description: updatedPlan.description,
        price: updatedPlan.price,
        isActive: updatedPlan.isActive,
        features: updatedPlan.features.map(pf => ({
          id: pf.feature.id,
          name: pf.feature.name,
          description: pf.feature.description,
          isIncluded: true,
        })),
        companiesCount: updatedPlan.companies.length,
        createdAt: updatedPlan.createdAt,
        updatedAt: updatedPlan.updatedAt,
      };

      
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
    return res.status(200).json(response);
    }

    // DELETE - Excluir um plano
    if (req.method === 'DELETE') {
      // Verificar se o plano existe
      const existingPlan = await prisma.plan.findUnique({
        where: { id },
        include: {
          companies: true,
        },
      });

      if (!existingPlan) {
        return res.status(404).json({ message: 'Plano não encontrado' });
      }

      // Verificar se o plano está sendo usado por empresas
      if (existingPlan.companies.length > 0) {
        return res.status(400).json({ 
          message: `Este plano está sendo usado por ${existingPlan.companies.length} empresas. Altere o plano das empresas primeiro.` 
        });
      }

      // Remover todas as associações de recursos
      await prisma.planFeature.deleteMany({
        where: {
          planId: id,
        },
      });

      // Excluir o plano
      await prisma.plan.delete({
        where: { id },
      });

      
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
    return res.status(200).json({ message: 'Plano excluído com sucesso' });
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de planos:', error);
    
    // Verificar se é um erro de registro não encontrado
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Plano não encontrado' });
    }
    
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
