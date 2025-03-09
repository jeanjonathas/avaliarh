import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar categoria usando SQL direto
      const categories = await prisma.$queryRaw`
        SELECT 
          c.id,
          c.name,
          c.description,
          c."createdAt",
          c."updatedAt",
          COUNT(q.id) as "questionsCount"
        FROM "Category" c
        LEFT JOIN "Question" q ON q."categoryId" = c.id
        WHERE c.id = ${id}::uuid
        GROUP BY c.id
      `;
      
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada' })
      }
      
      // Converter questionsCount para Number para evitar erro de serialização
      const category = {
        ...categories[0],
        questionsCount: Number(categories[0].questionsCount)
      };

      return res.status(200).json(category)
    } catch (error) {
      console.error('Erro ao buscar categoria:', error)
      return res.status(500).json({ error: 'Erro ao buscar categoria' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Nome da categoria é obrigatório' })
      }

      // Verificar se já existe outra categoria com o mesmo nome
      const existingCategories = await prisma.$queryRaw`
        SELECT id FROM "Category"
        WHERE name = ${name} AND id != ${id}::uuid
      `;
      
      if (Array.isArray(existingCategories) && existingCategories.length > 0) {
        return res.status(400).json({ error: 'Já existe outra categoria com este nome' })
      }

      // Atualizar a categoria usando SQL direto
      await prisma.$executeRaw`
        UPDATE "Category"
        SET 
          name = ${name},
          description = ${description || null},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${id}::uuid
      `;
      
      // Buscar a categoria atualizada
      const updatedCategories = await prisma.$queryRaw`
        SELECT id, name, description, "createdAt", "updatedAt"
        FROM "Category"
        WHERE id = ${id}::uuid
      `;
      
      if (!Array.isArray(updatedCategories) || updatedCategories.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada após atualização' })
      }
      
      const updatedCategory = updatedCategories[0];

      return res.status(200).json(updatedCategory)
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      return res.status(500).json({ error: 'Erro ao atualizar categoria' })
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log(`Tentando excluir categoria com ID: ${id}`);
      
      // Verificar se a categoria existe
      const categoryExists = await prisma.$queryRaw`
        SELECT id FROM "Category" WHERE id = ${id}::uuid
      `;
      
      if (!Array.isArray(categoryExists) || categoryExists.length === 0) {
        console.log(`Categoria não encontrada: ${id}`);
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
      
      // Verificar se existem perguntas associadas
      const checkColumn = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Question' AND column_name = 'categoryId'
      `;
      
      if (Array.isArray(checkColumn) && checkColumn.length > 0) {
        const questionsCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "Question"
          WHERE "categoryId" = ${id}::uuid
        `;
        
        const count = Number(questionsCount[0].count);
        console.log(`Número de perguntas associadas: ${count}`);
        
        if (count > 0) {
          return res.status(400).json({
            error: 'Não é possível excluir esta categoria porque existem perguntas associadas a ela.'
          });
        }
      }
      
      // Excluir a categoria usando SQL direto
      await prisma.$executeRaw`
        DELETE FROM "Category"
        WHERE id = ${id}::uuid
      `;
      
      console.log(`Categoria excluída com sucesso: ${id}`);
      return res.status(200).json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      return res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
