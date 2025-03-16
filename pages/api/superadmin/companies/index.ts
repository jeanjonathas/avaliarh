import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Manipula diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getCompanies(req, res);
    case 'POST':
      return createCompany(req, res);
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// GET - Listar todas as empresas
async function getCompanies(req: NextApiRequest, res: NextApiResponse) {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            users: true,
            candidates: true,
            tests: true,
            processes: true,
          },
        },
      },
    });

    return res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({ message: 'Erro ao buscar empresas' });
  }
}

// POST - Criar uma nova empresa
async function createCompany(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      cnpj,
      plan,
      isActive,
      maxUsers,
      maxCandidates,
      lastPaymentDate,
      trialEndDate,
    } = req.body;

    // Validação básica
    if (!name || !plan) {
      return res.status(400).json({ message: 'Nome e plano são obrigatórios' });
    }

    // Verifica se já existe uma empresa com o mesmo CNPJ
    if (cnpj) {
      const existingCompany = await prisma.company.findUnique({
        where: { cnpj },
      });

      if (existingCompany) {
        return res.status(400).json({ message: 'Já existe uma empresa com este CNPJ' });
      }
    }

    // Cria a nova empresa
    const newCompany = await prisma.company.create({
      data: {
        name,
        cnpj: cnpj || null,
        plan,
        isActive: isActive !== undefined ? isActive : true,
        maxUsers: maxUsers || 10,
        maxCandidates: maxCandidates || 100,
        lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : null,
      },
    });

    return res.status(201).json(newCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    return res.status(500).json({ message: 'Erro ao criar empresa' });
  }
}
