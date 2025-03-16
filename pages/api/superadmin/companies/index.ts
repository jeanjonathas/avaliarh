import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
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
    // Usando $queryRaw para evitar problemas com o modelo Company no Prisma
    const companies = await prisma.$queryRaw`
      SELECT c.*, 
        (SELECT COUNT(*) FROM "User" WHERE "companyId" = c.id) as "userCount",
        (SELECT COUNT(*) FROM "Candidate" WHERE "companyId" = c.id) as "candidateCount",
        (SELECT COUNT(*) FROM "Test" WHERE "companyId" = c.id) as "testCount",
        (SELECT COUNT(*) FROM "SelectionProcess" WHERE "companyId" = c.id) as "processCount"
      FROM "Company" c
      ORDER BY c.name ASC
    `;

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
      const existingCompany = await prisma.$queryRaw`
        SELECT * FROM "Company" WHERE cnpj = ${cnpj}
      `;

      if (existingCompany && Array.isArray(existingCompany) && existingCompany.length > 0) {
        return res.status(400).json({ message: 'Já existe uma empresa com este CNPJ' });
      }
    }

    // Cria a nova empresa usando $executeRaw
    await prisma.$executeRaw`
      INSERT INTO "Company" (
        id, name, cnpj, "planType", "isActive", "maxUsers", "maxCandidates", 
        "lastPaymentDate", "trialEndDate", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${name}, ${cnpj || null}, ${planType}, 
        ${isActive !== undefined ? isActive : true}, 
        ${maxUsers || 10}, 
        ${maxCandidates || 100},
        ${lastPaymentDate ? new Date(lastPaymentDate) : null},
        ${trialEndDate ? new Date(trialEndDate) : null},
        NOW(), NOW()
      )
    `;

    // Busca a empresa recém-criada
    const newCompany = await prisma.$queryRaw`
      SELECT * FROM "Company" 
      WHERE name = ${name}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    return res.status(201).json(Array.isArray(newCompany) ? newCompany[0] : newCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    return res.status(500).json({ message: 'Erro ao criar empresa' });
  }
}
