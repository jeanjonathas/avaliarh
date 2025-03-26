import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
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
  try {
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

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Erro ao buscar usuários' });
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
