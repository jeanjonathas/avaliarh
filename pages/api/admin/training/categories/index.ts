/// <reference types="next" />

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Definição dos papéis de usuário conforme o schema
type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Papéis permitidos para acessar este endpoint
const allowedRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`API Training Categories: Método ${req.method} recebido`);
  console.log('API Training Categories: Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    // Verificar autenticação usando getServerSession em vez de getSession
    const session = await getServerSession(req, res, authOptions);
    
    console.log('API Training Categories: Session:', session); // Log para depuração
    
    // Verifica se o usuário está autenticado
    if (!session) {
      console.log('API Training Categories: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autenticado' });
    }

    console.log(`API Training Categories: Papel do usuário: ${session.user.role}`);
    
    // Verifica se o usuário tem permissão
    if (!allowedRoles.includes(session.user.role as Role)) {
      const rolesMessage = allowedRoles.join(' ou ');
      console.log(`API Training Categories: Usuário não autorizado. Papel: ${session.user.role}, Papéis permitidos: ${rolesMessage}`);
      return res.status(403).json({ 
        message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
      });
    }

    if (req.method === 'GET') {
      try {
        console.log('API Training Categories: Buscando categorias de treinamento');
        
        // Buscar todas as categorias de treinamento usando SQL raw
        // Garantir que a conexão com o banco de dados esteja ativa
        await reconnectPrisma();
        const categoriesResult = await prisma.$queryRaw`
          SELECT * FROM "Category"
          WHERE "categoryType" = 'training'
          ORDER BY "name" ASC
        `;
        
        const categories = Array.isArray(categoriesResult) ? categoriesResult : [];
        
        console.log(`API Training Categories: ${categories.length} categorias encontradas`);
        return res.status(200).json(categories);
      } catch (error) {
        console.error('API Training Categories: Erro ao buscar categorias:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias' });
      }
    } else if (req.method === 'POST') {
      try {
        console.log('API Training Categories: Criando nova categoria de treinamento');
        console.log('API Training Categories: Dados recebidos:', req.body);
        
        const { name, description } = req.body;
        
        if (!name) {
          console.log('API Training Categories: Nome da categoria é obrigatório');
          return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
        }
        
        // Verificar se já existe uma categoria com o mesmo nome usando SQL raw
        const existingCategoryResult = await prisma.$queryRaw`
          SELECT * FROM "Category"
          WHERE LOWER("name") = LOWER(${name})
          AND "categoryType" = 'training'
          LIMIT 1
        `;
        
        const existingCategory = Array.isArray(existingCategoryResult) && existingCategoryResult.length > 0 
          ? existingCategoryResult[0] 
          : null;
        
        if (existingCategory) {
          console.log(`API Training Categories: Categoria com nome "${name}" já existe`);
          return res.status(400).json({ message: 'Já existe uma categoria com este nome' });
        }
        
        // Criar nova categoria de treinamento usando SQL raw
        const newCategoryId = Prisma.raw('gen_random_uuid()');
        const now = Prisma.raw('NOW()');
        
        const newCategoryResult = await prisma.$queryRaw`
          INSERT INTO "Category" (
            "id", "name", "description", "categoryType", "createdAt", "updatedAt"
          ) VALUES (
            ${newCategoryId}, ${name}, ${description || null}, 'training', ${now}, ${now}
          )
          RETURNING *
        `;
        
        const newCategory = Array.isArray(newCategoryResult) && newCategoryResult.length > 0 
          ? newCategoryResult[0] 
          : null;
        
        console.log('API Training Categories: Categoria criada com sucesso:', newCategory);
        return res.status(201).json(newCategory);
      } catch (error) {
        console.error('API Training Categories: Erro ao criar categoria:', error);
        return res.status(500).json({ message: 'Erro ao criar categoria' });
      }
    } else if (req.method === 'DELETE') {
      try {
        const { id } = req.query
        
        if (!id || typeof id !== 'string') {
          console.log('API Training Categories: ID da categoria é obrigatório');
          return res.status(400).json({ message: 'ID da categoria é obrigatório' });
        }
        
        console.log(`API Training Categories: Excluindo categoria com ID: ${id}`);
        
        // Verificar se a categoria existe e é do tipo treinamento usando SQL raw
        const categoryResult = await prisma.$queryRaw`
          SELECT * FROM "Category"
          WHERE "id" = ${id}
          AND "categoryType" = 'training'
          LIMIT 1
        `;
        
        const category = Array.isArray(categoryResult) && categoryResult.length > 0 
          ? categoryResult[0] 
          : null;
        
        if (!category) {
          console.log(`API Training Categories: Categoria com ID ${id} não encontrada`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Excluir categoria usando SQL raw
        await prisma.$queryRaw`
          DELETE FROM "Category"
          WHERE "id" = ${id}
        `;
        
        console.log(`API Training Categories: Categoria excluída com sucesso: ${id}`);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('API Training Categories: Erro ao excluir categoria:', error);
        return res.status(500).json({ message: 'Erro ao excluir categoria' });
      }
    } else {
      console.log(`API Training Categories: Método ${req.method} não permitido`);
      res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('API Training Categories: Erro no handler principal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
