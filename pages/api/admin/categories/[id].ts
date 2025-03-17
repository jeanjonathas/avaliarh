import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

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
      // Buscar categoria usando Prisma Client
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { questions: true }
          }
        }
      });
      
      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' })
      }
      
      // Adicionar a contagem de questões ao objeto da categoria
      const categoryWithCount = {
        ...category,
        questionsCount: category._count.questions
      };

      return res.status(200).json(categoryWithCount)
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
      const existingCategory = await prisma.category.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });
      
      if (existingCategory) {
        return res.status(400).json({ error: 'Já existe outra categoria com este nome' })
      }

      // Atualizar a categoria usando Prisma Client
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          name,
          description: description || null
        }
      });

      return res.status(200).json(updatedCategory)
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      return res.status(500).json({ error: 'Erro ao atualizar categoria' })
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log(`Tentando excluir categoria com ID: ${id}`);
      
      try {
        // Verificar se existem questões associadas usando a relação many-to-many correta
        const questionsCount = await prisma.question.count({
          where: {
            categories: {
              some: {
                id: id
              }
            }
          }
        });
        
        if (questionsCount > 0) {
          return res.status(400).json({
            error: 'Não é possível excluir esta categoria porque existem questões associadas a ela.'
          });
        }
        
        // Excluir a categoria
        await prisma.category.delete({
          where: { id }
        });
        
        console.log(`Categoria excluída com sucesso: ${id}`);
        return res.status(200).json({ message: 'Categoria excluída com sucesso' });
      } catch (deleteError) {
        console.error('Erro ao excluir categoria:', deleteError);
        return res.status(500).json({ 
          error: 'Erro ao excluir categoria',
          details: deleteError instanceof Error ? deleteError.message : 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      return res.status(500).json({ 
        error: 'Erro ao excluir categoria',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
