/// <reference types="next" />

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma';

// Definição dos papéis de usuário conforme o schema
type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Papéis permitidos para acessar este endpoint
const allowedRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`API Categories: Método ${req.method} recebido`);
  console.log('API Categories: Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    // Verificar autenticação usando getServerSession em vez de getSession
    const session = await getServerSession(req, res, authOptions);
    
    console.log('API Categories: Session:', session); // Log para depuração
    
    // Verifica se o usuário está autenticado
    if (!session) {
      console.log('API Categories: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autenticado' });
    }

    console.log(`API Categories: Papel do usuário: ${session.user.role}`);
    
    // Verifica se o usuário tem permissão
    if (!allowedRoles.includes(session.user.role as Role)) {
      const rolesMessage = allowedRoles.join(' ou ');
      console.log(`API Categories: Usuário não autorizado. Papel: ${session.user.role}, Papéis permitidos: ${rolesMessage}`);
      return res.status(403).json({ 
        message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
      });
    }

    if (req.method === 'GET') {
      try {
        console.log('API Categories: Buscando categorias');
        
        // Determinar o tipo de categoria com base no referer ou query parameter
        const referer = req.headers.referer || '';
        const categoryTypeFromQuery = req.query.categoryType as string;
        let categoryType = 'selection'; // Valor padrão
        
        if (categoryTypeFromQuery) {
          // Se fornecido explicitamente na query, use esse valor
          categoryType = categoryTypeFromQuery;
        } else if (referer.includes('/admin/training/')) {
          // Se o referer contém '/admin/training/', é uma categoria de treinamento
          categoryType = 'training';
        }
        
        console.log(`API Categories: Tipo de categoria determinado: ${categoryType}`);
        
        // Buscar todas as categorias usando o Prisma Client em vez de SQL raw
        // Temporariamente removendo o filtro por categoryType até que o Prisma Client seja atualizado
        const categories = await prisma.category.findMany({
          include: {
            _count: {
              select: {
                questions: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });
        
        // Transformar os dados para incluir questionsCount
        const formattedCategories = categories.map(category => ({
          id: category.id,
          name: category.name,
          description: category.description,
          questionsCount: category._count.questions
        }));
        
        console.log(`API Categories: ${formattedCategories.length} categorias encontradas`);
        return res.status(200).json(formattedCategories);
      } catch (error) {
        console.error('API Categories: Erro ao buscar categorias:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias' });
      }
    } else if (req.method === 'POST') {
      try {
        console.log('API Categories: Criando nova categoria');
        console.log('API Categories: Dados recebidos:', req.body);
        
        const { name, description } = req.body;
        
        if (!name) {
          console.log('API Categories: Nome da categoria é obrigatório');
          return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
        }
        
        // Determinar o tipo de categoria com base no referer ou body parameter
        const referer = req.headers.referer || '';
        const categoryTypeFromBody = req.body.categoryType;
        let categoryType = 'selection'; // Valor padrão
        
        if (categoryTypeFromBody) {
          // Se fornecido explicitamente no body, use esse valor
          categoryType = categoryTypeFromBody;
        } else if (referer.includes('/admin/training/')) {
          // Se o referer contém '/admin/training/', é uma categoria de treinamento
          categoryType = 'training';
        }
        
        console.log(`API Categories: Tipo de categoria determinado: ${categoryType}`);
        
        // Verificar se já existe uma categoria com o mesmo nome
        // Temporariamente removendo o filtro por categoryType até que o Prisma Client seja atualizado
        const existingCategory = await prisma.category.findFirst({
          where: {
            name: {
              equals: name,
              mode: 'insensitive'
            }
          }
        });
        
        if (existingCategory) {
          console.log(`API Categories: Categoria com nome "${name}" já existe`);
          return res.status(400).json({ message: 'Já existe uma categoria com este nome' });
        }
        
        // Criar nova categoria
        // Temporariamente removendo o campo categoryType até que o Prisma Client seja atualizado
        const newCategory = await prisma.category.create({
          data: {
            name,
            description: description || null
          }
        });
        
        console.log('API Categories: Categoria criada com sucesso:', newCategory);
        return res.status(201).json(newCategory);
      } catch (error) {
        console.error('API Categories: Erro ao criar categoria:', error);
        return res.status(500).json({ message: 'Erro ao criar categoria' });
      }
    } else if (req.method === 'DELETE') {
      try {
        const { id } = req.query
        
        if (!id || typeof id !== 'string') {
          console.log('API Categories: ID da categoria é obrigatório');
          return res.status(400).json({ message: 'ID da categoria é obrigatório' });
        }
        
        console.log(`API Categories: Excluindo categoria com ID: ${id}`);
        
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
          
          console.log(`API Categories: Número de perguntas associadas: ${questionsCount}`);
          
          if (questionsCount > 0) {
            console.log('API Categories: Não é possível excluir esta categoria porque existem perguntas associadas a ela.');
            return res.status(400).json({
              message: 'Não é possível excluir esta categoria porque existem perguntas associadas a ela.'
            });
          }
          
          // Excluir categoria
          await prisma.category.delete({
            where: {
              id: id
            }
          });
          
          console.log(`API Categories: Categoria excluída com sucesso: ${id}`);
          return res.status(200).json({ success: true });
        } catch (error) {
          console.error('API Categories: Erro ao excluir categoria:', error);
          return res.status(500).json({ message: 'Erro ao excluir categoria' });
        }
      } catch (error) {
        console.error('API Categories: Erro ao excluir categoria:', error);
        return res.status(500).json({ message: 'Erro ao excluir categoria' });
      }
    } else {
      console.log(`API Categories: Método ${req.method} não permitido`);
      res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Categories: Erro no handler principal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
