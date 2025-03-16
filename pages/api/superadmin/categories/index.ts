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
      // Buscar categorias com contagem de questões
      const categories = await prisma.$queryRaw`
        SELECT 
          c.id, 
          c.name, 
          c.description, 
          c."createdAt", 
          c."updatedAt",
          COUNT(DISTINCT q.id) as "questionsCount"
        FROM "Category" c
        LEFT JOIN "Question" q ON q."categoryId" = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `;

      return res.status(200).json(categories);
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
