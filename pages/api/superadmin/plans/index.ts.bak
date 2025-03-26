import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/plans`);
    
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

    // GET - Listar todos os planos
    if (req.method === 'GET') {
      const plans = await prisma.plan.findMany({
        include: {
          features: {
            include: {
              feature: true,
            },
          },
          companies: true,
        },
        orderBy: {
          price: 'asc',
        },
      });

      // Formatar os dados para o frontend
      const formattedPlans = plans.map(plan => {
        return {
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
          companiesCount: plan.companies.length,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        };
      });

      return res.status(200).json(formattedPlans);
    }

    // POST - Criar um novo plano
    if (req.method === 'POST') {
      const { name, description, price, isActive } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ message: 'Nome e preço são obrigatórios' });
      }

      // Criar o plano
      const newPlan = await prisma.plan.create({
        data: {
          name,
          description: description || null,
          price: parseFloat(price.toString()),
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          companies: true,
        },
      });

      // Formatar a resposta
      const response = {
        id: newPlan.id,
        name: newPlan.name,
        description: newPlan.description,
        price: newPlan.price,
        isActive: newPlan.isActive,
        features: [],
        companiesCount: 0,
        createdAt: newPlan.createdAt,
        updatedAt: newPlan.updatedAt,
      };

      return res.status(201).json(response);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de planos:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
