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
      // Buscar categorias globais com contagem de questões
      const categories = await prisma.$queryRaw`
        SELECT 
          gc.id, 
          gc.name, 
          gc.description, 
          gc."createdAt", 
          gc."updatedAt",
          COUNT(DISTINCT gcq."A") as "questionsCount"
        FROM "GlobalCategory" gc
        LEFT JOIN "_GlobalCategoryToGlobalQuestion" gcq ON gc.id = gcq."B"
        GROUP BY gc.id
        ORDER BY gc.name ASC
      `;

      return res.status(200).json(categories);
    }

    // POST - Criar uma nova categoria global
    if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
      }

      // Criar nova categoria global
      await prisma.$executeRaw`
        INSERT INTO "GlobalCategory" (id, name, description, "createdAt", "updatedAt")
        VALUES (uuid_generate_v4(), ${name}, ${description || null}, NOW(), NOW())
      `;
      
      // Buscar a categoria recém-criada
      const newCategory = await prisma.$queryRaw`
        SELECT * FROM "GlobalCategory" 
        WHERE name = ${name}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      return res.status(201).json(Array.isArray(newCategory) ? newCategory[0] : newCategory);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de categorias globais:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
