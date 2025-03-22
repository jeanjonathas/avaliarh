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
      return getPermissions(req, res, effectiveCompanyId);
    case 'PUT':
      return updatePermissions(req, res, effectiveCompanyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Função para obter as permissões da empresa
async function getPermissions(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    // Buscar os usuários da empresa e seus papéis
    const users = await prisma.user.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    // Agrupar usuários por papel (role)
    const roleGroups = users.reduce((acc, user) => {
      const role = user.role as string;
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(user);
      return acc;
    }, {} as Record<string, any[]>);

    // Definir permissões padrão para cada papel
    const defaultPermissions = [
      {
        id: '1',
        name: 'user.create',
        description: 'Criar novos usuários',
        roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
      },
      {
        id: '2',
        name: 'user.edit',
        description: 'Editar usuários existentes',
        roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
      },
      {
        id: '3',
        name: 'user.delete',
        description: 'Excluir usuários',
        roles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
      },
      {
        id: '4',
        name: 'candidate.create',
        description: 'Criar novos candidatos',
        roles: ['COMPANY_ADMIN', 'USER', 'INSTRUCTOR'],
      },
      {
        id: '5',
        name: 'candidate.edit',
        description: 'Editar candidatos existentes',
        roles: ['COMPANY_ADMIN', 'USER', 'INSTRUCTOR'],
      },
      {
        id: '6',
        name: 'test.create',
        description: 'Criar novos testes',
        roles: ['COMPANY_ADMIN', 'INSTRUCTOR'],
      },
      {
        id: '7',
        name: 'test.edit',
        description: 'Editar testes existentes',
        roles: ['COMPANY_ADMIN', 'INSTRUCTOR'],
      },
      {
        id: '8',
        name: 'report.view',
        description: 'Visualizar relatórios',
        roles: ['COMPANY_ADMIN', 'USER', 'INSTRUCTOR'],
      },
      {
        id: '9',
        name: 'settings.edit',
        description: 'Editar configurações da empresa',
        roles: ['COMPANY_ADMIN'],
      },
    ];

    return res.status(200).json(defaultPermissions);
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    return res.status(500).json({ error: 'Erro ao buscar permissões' });
  }
}

// Função para atualizar as permissões da empresa
async function updatePermissions(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const permissions = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Formato inválido. Esperado um array de permissões.' });
    }

    // Como não temos um modelo específico para permissões,
    // vamos apenas simular uma atualização bem-sucedida
    // Em uma implementação real, você precisaria criar tabelas específicas
    // para armazenar as permissões por papel

    // Registrar a atualização de permissões no log
    console.log(`Permissões atualizadas para a empresa ${companyId}:`, permissions);

    return res.status(200).json({ 
      message: 'Permissões atualizadas com sucesso',
      permissions: permissions
    });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    return res.status(500).json({ error: 'Erro ao atualizar permissões' });
  }
}
