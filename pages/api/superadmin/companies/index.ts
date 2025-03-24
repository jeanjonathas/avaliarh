import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Manipula diferentes métodos HTTP
    switch (req.method) {
      case 'GET':
        return getCompanies(req, res);
      case 'POST':
        return createCompany(req, res);
      default:
        return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Error in API handler:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

// GET - Listar todas as empresas
async function getCompanies(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Usando $queryRaw para evitar problemas com o modelo Company no Prisma
    const companies = await prisma.$queryRaw`
      SELECT c.*, 
        COALESCE((SELECT COUNT(*) FROM "User" WHERE "companyId" = c.id), 0) as "userCount",
        COALESCE((SELECT COUNT(*) FROM "Candidate" WHERE "companyId" = c.id), 0) as "candidateCount",
        COALESCE((SELECT COUNT(*) FROM "Test" WHERE "companyId" = c.id), 0) as "testCount",
        COALESCE((SELECT COUNT(*) FROM "SelectionProcess" WHERE "companyId" = c.id), 0) as "processCount"
      FROM "Company" c
      ORDER BY c.name ASC
    `;

    // Garantir que os valores sejam convertidos para números
    const formattedCompanies = Array.isArray(companies) ? companies.map(company => ({
      ...company,
      userCount: Number(company.userCount || 0),
      candidateCount: Number(company.candidateCount || 0),
      testCount: Number(company.testCount || 0),
      processCount: Number(company.processCount || 0)
    })) : [];

    return res.status(200).json(formattedCompanies);
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
      planType,
      isActive,
      maxUsers,
      maxCandidates,
      lastPaymentDate,
      trialEndDate,
    } = req.body;

    // Validação básica
    if (!name || !planType) {
      return res.status(400).json({ message: 'Nome e plano são obrigatórios' });
    }

    // Verifica se já existe uma empresa com o mesmo CNPJ
    if (cnpj) {
      const existingCompany = await prisma.company.findUnique({
        where: {
          cnpj: cnpj
        }
      });

      if (existingCompany) {
        return res.status(400).json({ message: 'Já existe uma empresa com este CNPJ' });
      }
    }

    // Cria a nova empresa usando o Prisma Client diretamente
    const newCompany = await prisma.company.create({
      data: {
        name,
        cnpj: cnpj || null,
        planType,
        isActive: isActive !== undefined ? isActive : true,
        maxUsers: maxUsers || 10,
        maxCandidates: maxCandidates || 100,
        lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : null,
      }
    });

    return res.status(201).json(newCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    return res.status(500).json({ message: 'Erro ao criar empresa' });
  }
}
