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
    // Usando métodos nativos do Prisma em vez de $queryRaw
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cnpj: true,
        planType: true,
        isActive: true,
        maxUsers: true,
        maxCandidates: true,
        lastPaymentDate: true,
        trialEndDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            candidates: true,
            questions: true, // Usamos questions como proxy para testes
            processes: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Serializar a empresa para o formato esperado pelo frontend
    const serializedCompany = {
      ...company,
      userCount: company._count.users,
      candidateCount: company._count.candidates,
      testCount: company._count.questions, // Usamos questions como proxy para testes
      processCount: company._count.processes,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
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

    // Verifica se a empresa existe
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Verifica se já existe outra empresa com o mesmo CNPJ
    if (cnpj) {
      const companyWithSameCNPJ = await prisma.company.findFirst({
        where: {
          cnpj,
          id: { not: id }
        }
      });

      if (companyWithSameCNPJ) {
        return res.status(400).json({ message: 'Já existe outra empresa com este CNPJ' });
      }
    }

    // Atualiza a empresa
    const updatedCompany = await prisma.company.update({
      where: { id },
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

    return res.status(200).json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error);
    return res.status(500).json({ message: 'Erro ao atualizar empresa' });
  }
}

// DELETE - Excluir uma empresa
async function deleteCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verifica se a empresa existe
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Busca todos os dados relacionados à empresa para backup
    const users = await prisma.user.findMany({
      where: { companyId: id }
    });

    const candidates = await prisma.candidate.findMany({
      where: { companyId: id }
    });

    const tests = await prisma.test.findMany({
      where: { companyId: id }
    });

    const processes = await prisma.selectionProcess.findMany({
      where: { companyId: id }
    });

    // Cria um backup da empresa e seus dados relacionados
    const backupData = {
      company: existingCompany,
      users,
      candidates,
      tests,
      processes
    };

    // Salva o backup em log para recuperação posterior se necessário
    try {
      // Registra os dados no log para recuperação posterior
      console.log('COMPANY_BACKUP_DATA:', JSON.stringify(backupData));
    } catch (backupError) {
      console.warn('Não foi possível registrar o backup:', backupError);
    }

    // Exclui todos os dados relacionados à empresa usando transação
    await prisma.$transaction([
      // Exclui os usuários associados à empresa
      prisma.user.deleteMany({
        where: { companyId: id }
      }),
      
      // Exclui os candidatos associados à empresa
      prisma.candidate.deleteMany({
        where: { companyId: id }
      }),
      
      // Exclui os testes associados à empresa
      prisma.test.deleteMany({
        where: { companyId: id }
      }),
      
      // Exclui os processos associados à empresa
      prisma.selectionProcess.deleteMany({
        where: { companyId: id }
      }),
      
      // Finalmente, exclui a empresa
      prisma.company.delete({
        where: { id }
      })
    ]);

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
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Desativa a empresa
    await prisma.company.update({
      where: { id },
      data: { isActive: false }
    });

    return res.status(200).json({ 
      message: 'Empresa desativada com sucesso',
    });
  } catch (error) {
    console.error('Error deactivating company:', error);
    return res.status(500).json({ message: 'Erro ao desativar empresa' });
  }
}
