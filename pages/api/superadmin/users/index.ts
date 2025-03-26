import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user?.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Manipula diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getUsers(req, res);
    case 'POST':
      return createUser(req, res);
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// GET - Listar todos os usuários
async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[USERS] Iniciando busca de usuários (${new Date().toISOString()})`);
  
  try {
    console.log(`[USERS] Executando consulta Prisma para buscar usuários`);
    
    // Forçar desconexão e reconexão para garantir dados frescos
    await reconnectPrisma();
    
    // Buscar usuários com ordenação por nome
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`[USERS] Encontrados ${users.length} usuários`);
    
    // Verificar se há duplicatas nos IDs
    const uniqueIds = new Set(users.map(user => user.id));
    console.log(`[USERS] Número de IDs únicos: ${uniqueIds.size}`);
    
    if (uniqueIds.size !== users.length) {
      console.warn(`[USERS] ALERTA: Foram encontrados usuários com IDs duplicados!`);
    }
    
    // Verificar duplicatas por email
    const emailMap = new Map();
    users.forEach(user => {
      if (user.email) {
        if (emailMap.has(user.email.toLowerCase())) {
          console.warn(`[USERS] ALERTA: Email duplicado encontrado: ${user.email}`);
          console.warn(`[USERS] Usuários com mesmo email: ${emailMap.get(user.email.toLowerCase()).id} e ${user.id}`);
        } else {
          emailMap.set(user.email.toLowerCase(), user);
        }
      }
    });
    
    // Formatar resultados para o frontend
    console.log(`[USERS] Formatando resultados para o frontend`);
    const formattedUsers = users.map(user => ({
      ...user,
      createdAt: user.createdAt?.toISOString() || null,
      updatedAt: user.updatedAt?.toISOString() || null,
    }));
    
    // Remover duplicatas antes de retornar
    const uniqueUsers = Array.from(
      new Map(formattedUsers.map(user => [user.id, user])).values()
    );
    
    if (uniqueUsers.length !== formattedUsers.length) {
      console.warn(`[USERS] Removidas ${formattedUsers.length - uniqueUsers.length} usuários duplicados`);
    }
    
    console.log(`[USERS] Retornando ${uniqueUsers.length} usuários formatados`);
    return res.status(200).json(uniqueUsers);
  } catch (error) {
    console.error(`[USERS] Erro ao buscar usuários:`, error);
    return res.status(500).json({ message: 'Erro ao buscar usuários' });
  } finally {
    console.log(`[USERS] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
  }
}

// POST - Criar um novo usuário
async function createUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      email,
      password,
      role,
      companyId,
    } = req.body;

    // Validação básica
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    // Verifica se já existe um usuário com o mesmo email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Já existe um usuário com este email' });
    }

    // Se o usuário for vinculado a uma empresa, verifica se a empresa existe
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(400).json({ message: 'Empresa não encontrada' });
      }

      // Verifica se a empresa atingiu o limite de usuários
      const userCount = await prisma.user.count({
        where: { companyId },
      });

      if (userCount >= company.maxUsers) {
        return res.status(400).json({ message: 'A empresa atingiu o limite de usuários' });
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria o novo usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        companyId: companyId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Erro ao criar usuário' });
  }
}
