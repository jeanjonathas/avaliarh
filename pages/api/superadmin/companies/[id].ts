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
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// GET - Obter detalhes de uma empresa específica
async function getCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
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

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    return res.status(200).json(company);
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
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Verifica se já existe outra empresa com o mesmo CNPJ
    if (cnpj && cnpj !== existingCompany.cnpj) {
      const companyWithSameCnpj = await prisma.company.findUnique({
        where: { cnpj },
      });

      if (companyWithSameCnpj && companyWithSameCnpj.id !== id) {
        return res.status(400).json({ message: 'Já existe uma empresa com este CNPJ' });
      }
    }

    // Atualiza a empresa
    const updatedCompany = await prisma.company.update({
      where: { id },
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
      where: { id },
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

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Verifica se a empresa tem usuários, candidatos, testes ou processos
    const hasRelatedData = 
      existingCompany._count.users > 0 || 
      existingCompany._count.candidates > 0 || 
      existingCompany._count.tests > 0 || 
      existingCompany._count.processes > 0;

    if (hasRelatedData) {
      return res.status(400).json({ 
        message: 'Não é possível excluir a empresa pois ela possui dados relacionados. Desative-a em vez de excluí-la.' 
      });
    }

    // Exclui a empresa
    await prisma.company.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Empresa excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return res.status(500).json({ message: 'Erro ao excluir empresa' });
  }
}
