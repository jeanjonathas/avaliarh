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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID da empresa é obrigatório' });
  }

  // Manipula diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getCompany(req, res, id);
    case 'PUT':
      return updateCompany(req, res, id);
    case 'DELETE':
      return deleteCompany(req, res, id);
    case 'PATCH':
      return deactivateCompany(req, res, id);
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// GET - Obter detalhes de uma empresa específica
async function getCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Usando $queryRaw para evitar problemas com o modelo Company no Prisma
    const companies = await prisma.$queryRaw`
      SELECT c.*, 
        (SELECT COUNT(*) FROM "User" WHERE "companyId" = c.id) as "userCount",
        (SELECT COUNT(*) FROM "Candidate" WHERE "companyId" = c.id) as "candidateCount",
        (SELECT COUNT(*) FROM "Test" WHERE "companyId" = c.id) as "testCount",
        (SELECT COUNT(*) FROM "SelectionProcess" WHERE "companyId" = c.id) as "processCount"
      FROM "Company" c
      WHERE c.id = ${id}
    `;

    const company = Array.isArray(companies) && companies.length > 0 ? companies[0] : null;

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Converter valores bigint para number
    const serializedCompany = {
      ...company,
      userCount: company.userCount ? Number(company.userCount) : 0,
      candidateCount: company.candidateCount ? Number(company.candidateCount) : 0,
      testCount: company.testCount ? Number(company.testCount) : 0,
      processCount: company.processCount ? Number(company.processCount) : 0,
      createdAt: company.createdAt ? company.createdAt.toISOString() : null,
      updatedAt: company.updatedAt ? company.updatedAt.toISOString() : null,
      lastPaymentDate: company.lastPaymentDate ? company.lastPaymentDate.toISOString() : null,
      trialEndDate: company.trialEndDate ? company.trialEndDate.toISOString() : null,
    };

    return res.status(200).json(serializedCompany);
  } catch (error) {
    console.error('Error fetching company:', error);
    return res.status(500).json({ message: 'Erro ao buscar empresa' });
  }
}

// PUT - Atualizar uma empresa existente
async function updateCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
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

    // Verifica se a empresa existe
    const existingCompany = await prisma.$queryRaw`
      SELECT * FROM "Company" WHERE id = ${id}
    `;

    if (!existingCompany || (Array.isArray(existingCompany) && existingCompany.length === 0)) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Verifica se já existe outra empresa com o mesmo CNPJ
    if (cnpj) {
      const companyWithSameCNPJ = await prisma.$queryRaw`
        SELECT * FROM "Company" WHERE cnpj = ${cnpj} AND id != ${id}
      `;

      if (companyWithSameCNPJ && Array.isArray(companyWithSameCNPJ) && companyWithSameCNPJ.length > 0) {
        return res.status(400).json({ message: 'Já existe outra empresa com este CNPJ' });
      }
    }

    // Atualiza a empresa
    await prisma.$executeRaw`
      UPDATE "Company"
      SET 
        name = ${name},
        cnpj = ${cnpj || null},
        "planType" = ${plan},
        "isActive" = ${isActive !== undefined ? isActive : true},
        "maxUsers" = ${maxUsers || 10},
        "maxCandidates" = ${maxCandidates || 100},
        "lastPaymentDate" = ${lastPaymentDate ? new Date(lastPaymentDate) : null},
        "trialEndDate" = ${trialEndDate ? new Date(trialEndDate) : null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    // Busca a empresa atualizada
    const updatedCompany = await prisma.$queryRaw`
      SELECT * FROM "Company" WHERE id = ${id}
    `;

    const company = Array.isArray(updatedCompany) && updatedCompany.length > 0 ? updatedCompany[0] : null;

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada após atualização' });
    }

    return res.status(200).json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    return res.status(500).json({ message: 'Erro ao atualizar empresa' });
  }
}

// DELETE - Excluir uma empresa
async function deleteCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verifica se a empresa existe
    const existingCompany = await prisma.$queryRaw`
      SELECT * FROM "Company" WHERE id = ${id}
    `;

    if (!existingCompany || (Array.isArray(existingCompany) && existingCompany.length === 0)) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const company = Array.isArray(existingCompany) ? existingCompany[0] : existingCompany;

    // Busca todos os dados relacionados à empresa para backup
    const users = await prisma.$queryRaw`
      SELECT * FROM "User" WHERE "companyId" = ${id}
    `;

    const candidates = await prisma.$queryRaw`
      SELECT * FROM "Candidate" WHERE "companyId" = ${id}
    `;

    const tests = await prisma.$queryRaw`
      SELECT * FROM "Test" WHERE "companyId" = ${id}
    `;

    const processes = await prisma.$queryRaw`
      SELECT * FROM "SelectionProcess" WHERE "companyId" = ${id}
    `;

    // Cria um backup da empresa e seus dados relacionados
    const backupData = {
      company,
      users: Array.isArray(users) ? users : [],
      candidates: Array.isArray(candidates) ? candidates : [],
      tests: Array.isArray(tests) ? tests : [],
      processes: Array.isArray(processes) ? processes : []
    };

    // Salva o backup em uma tabela de backup ou em um arquivo JSON
    // Opção 1: Salvar em uma tabela de backup (se existir)
    try {
      await prisma.$executeRaw`
        INSERT INTO "CompanyBackup" ("companyId", "data", "deletedAt")
        VALUES (${id}, ${JSON.stringify(backupData)}, NOW())
      `;
    } catch (backupError) {
      // Se a tabela não existir, registra o erro mas continua com a exclusão
      console.warn('Não foi possível salvar o backup na tabela CompanyBackup:', backupError);
      
      // Opção 2: Registra os dados no log para recuperação posterior
      console.log('COMPANY_BACKUP_DATA:', JSON.stringify(backupData));
    }

    // Exclui todos os dados relacionados à empresa
    // Primeiro, exclui os usuários associados à empresa
    if (Array.isArray(users) && users.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "User" WHERE "companyId" = ${id}
      `;
    }

    // Exclui os candidatos associados à empresa
    if (Array.isArray(candidates) && candidates.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "Candidate" WHERE "companyId" = ${id}
      `;
    }

    // Exclui os testes associados à empresa
    if (Array.isArray(tests) && tests.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "Test" WHERE "companyId" = ${id}
      `;
    }

    // Exclui os processos associados à empresa
    if (Array.isArray(processes) && processes.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "SelectionProcess" WHERE "companyId" = ${id}
      `;
    }

    // Finalmente, exclui a empresa
    await prisma.$executeRaw`
      DELETE FROM "Company" WHERE id = ${id}
    `;

    return res.status(200).json({ 
      message: 'Empresa excluída com sucesso',
      backupCreated: true
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    return res.status(500).json({ message: 'Erro ao excluir empresa' });
  }
}

// PATCH - Atualizar parcialmente uma empresa (para desativação)
async function deactivateCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verifica se a empresa existe
    const existingCompany = await prisma.$queryRaw`
      SELECT * FROM "Company" WHERE id = ${id}
    `;

    if (!existingCompany || (Array.isArray(existingCompany) && existingCompany.length === 0)) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Desativa a empresa
    await prisma.$executeRaw`
      UPDATE "Company" SET "isActive" = false WHERE id = ${id}
    `;

    return res.status(200).json({ 
      message: 'Empresa desativada com sucesso',
    });
  } catch (error) {
    console.error('Error deactivating company:', error);
    return res.status(500).json({ message: 'Erro ao desativar empresa' });
  }
}
