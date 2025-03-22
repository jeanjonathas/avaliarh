import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar o token JWT (essa verificação é redundante devido ao middleware, mas mantida por segurança)
  const token = await getToken({ req });
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Verificar se o usuário tem permissão (COMPANY_ADMIN ou SUPER_ADMIN)
  const userRole = token.role as string;
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
  }

  // Obter o ID da empresa do token
  const companyId = token.companyId as string;
  // Como o token pode não ter o companyId, vamos buscar o usuário no banco para obter o companyId
  let effectiveCompanyId = companyId;
  
  if (!effectiveCompanyId && token.email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: token.email as string },
        select: { companyId: true }
      });
      
      if (user && user.companyId) {
        effectiveCompanyId = user.companyId;
      }
    } catch (error) {
      console.error('Erro ao buscar companyId do usuário:', error);
    }
  }

  if (!effectiveCompanyId) {
    return res.status(400).json({ error: 'ID da empresa não encontrado' });
  }

  // Tratar diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getCompany(req, res, effectiveCompanyId);
    case 'PUT':
      return updateCompany(req, res, effectiveCompanyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Função para obter os dados da empresa
async function getCompany(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
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
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    return res.status(200).json(company);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
}

// Função para atualizar os dados da empresa
async function updateCompany(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { name, cnpj, planType } = req.body;

    // Validar dados obrigatórios
    if (!name) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    // Validar CNPJ (formato básico)
    if (cnpj && !/^\d{14}$/.test(cnpj.replace(/[^\d]/g, ''))) {
      return res.status(400).json({ error: 'CNPJ inválido' });
    }

    // Atualizar a empresa - apenas campos editáveis: nome, CNPJ e plano
    const updatedCompany = await prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        name,
        cnpj: cnpj || null,
        planType: planType || null,
        updatedAt: new Date(),
      },
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
      },
    });

    return res.status(200).json(updatedCompany);
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
}
