import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verificar autenticação e permissão de superadmin
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
    // GET - Listar todas as categorias globais
    if (req.method === 'GET') {
      // Buscar categorias com contagem de questões usando métodos nativos do Prisma
      const categories = await prisma.category.findMany({
        orderBy: {
          name: 'asc'
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      // Formatar a resposta para manter compatibilidade com o frontend
      const formattedCategories = categories.map(category => ({
        ...category,
        questionsCount: category._count.questions
      }));

      return res.status(200).json(formattedCategories);
    }

    // POST - Criar uma nova categoria global
    if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
      }

      const newCategory = await prisma.category.create({
        data: {
          name,
          description: description || null,
        },
      });

      return res.status(201).json(newCategory);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de categorias:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
