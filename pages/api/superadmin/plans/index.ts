import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verificar autenticação e permissão de superadmin
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
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
