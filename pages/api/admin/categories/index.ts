/// <reference types="next" />

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

  if (req.method === 'GET') {
    try {
      console.log('Buscando categorias');
      
      // Buscar todas as categorias usando o Prisma Client em vez de SQL raw
      try {
        const categories = await prisma.category.findMany({
          include: {
            _count: {
              select: { questions: true }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });
        
        // Formatar os resultados para incluir a contagem de questões
        const formattedCategories = categories.map(category => ({
          ...category,
          questionsCount: category._count.questions
        }));
        
        console.log(`Encontradas ${formattedCategories.length} categorias`);
        return res.status(200).json(formattedCategories);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        // Retornar array vazio em vez de erro para não quebrar a UI
        return res.status(200).json([]);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([])
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description } = req.body
      
      if (!name) {
        return res.status(400).json({ error: 'Nome da categoria é obrigatório' })
      }
      
      console.log('Criando categoria:', { name, description });
      
      try {
        // Criar categoria usando o Prisma Client
        const newCategory = await prisma.category.create({
          data: {
            name,
            description: description || null
          }
        });
        
        console.log('Categoria criada com sucesso:', newCategory);
        return res.status(201).json(newCategory);
      } catch (error) {
        console.error('Erro ao criar categoria:', error);
        throw error; // Propagar o erro para o tratamento externo
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      return res.status(500).json({ error: 'Erro ao criar categoria' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' })
      }
      
      console.log(`Excluindo categoria com ID: ${id}`);
      
      // Verificar se existem perguntas associadas à categoria
      try {
        const questionsCount = await prisma.question.count({
          where: {
            categories: {
              some: {
                id: id
              }
            }
          }
        });
        
        console.log(`Número de perguntas associadas: ${questionsCount}`);
        
        if (questionsCount > 0) {
          return res.status(400).json({
            error: 'Não é possível excluir esta categoria porque existem perguntas associadas a ela.'
          });
        }
        
        // Excluir categoria
        await prisma.category.delete({
          where: {
            id: id
          }
        });
        
        console.log(`Categoria excluída com sucesso: ${id}`);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      return res.status(500).json({ error: 'Erro ao excluir categoria' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
