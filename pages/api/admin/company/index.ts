import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação usando o middleware centralizado
  const session = await getServerSession(req, res, authOptions);
  
  // Log para depuração
  console.log('[PRISMA] Verificando sessão em company:', session ? 'Autenticado' : 'Não autenticado');
  
  if (!session) {
    console.log('[PRISMA] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Verificar se o usuário tem permissão (COMPANY_ADMIN ou SUPER_ADMIN)
  const userRole = session.user.role as string;
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
    console.log(`[PRISMA] Permissão negada: Papel do usuário ${userRole} não tem acesso`);
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[PRISMA] Forçando reconexão do Prisma antes de buscar informações da empresa');
  await reconnectPrisma();

  // Obter o ID da empresa da sessão
  const companyId = session.user.companyId as string;
  // Como a sessão pode não ter o companyId, vamos buscar o usuário no banco para obter o companyId
  let effectiveCompanyId = companyId;
  
  if (!effectiveCompanyId && session.user.email) {
    try {
      console.log(`[PRISMA] CompanyId não encontrado na sessão, buscando pelo email: ${session.user.email}`);
      const user = await prisma.user.findUnique({
        where: { email: session.user.email as string },
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
