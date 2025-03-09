import type { NextApiRequest, NextApiResponse } from 'next'
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
      
      // Verificar se a tabela Category existe e criar se não existir
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "Category" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        // Verificar se a coluna categoryId existe na tabela Question
        const checkColumn = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Question' AND column_name = 'categoryId'
        `;
        
        if (!Array.isArray(checkColumn) || checkColumn.length === 0) {
          console.log('Coluna categoryId não existe, adicionando...');
          await prisma.$executeRaw`
            ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "categoryId" UUID
          `;
          
          // Adicionar a chave estrangeira
          try {
            await prisma.$executeRaw`
              ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" 
              FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL ON UPDATE CASCADE
            `;
          } catch (error) {
            console.error('Erro ao adicionar chave estrangeira (pode já existir):', error);
          }
        }
        
        console.log('Verificação/criação da tabela Category e coluna categoryId concluída');
      } catch (error) {
        console.error('Erro ao verificar/criar tabela Category ou coluna categoryId:', error);
      }
      
      // Buscar todas as categorias
      let categories = [];
      
      try {
        // Verificar se a coluna categoryId existe na tabela Question
        const checkColumn = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Question' AND column_name = 'categoryId'
        `;
        
        if (Array.isArray(checkColumn) && checkColumn.length > 0) {
          // Buscar todas as categorias com contagem de perguntas usando SQL raw
          categories = await prisma.$queryRaw`
            SELECT 
              c.id,
              c.name,
              c.description,
              c."createdAt",
              c."updatedAt",
              CAST(COUNT(q.id) AS INTEGER) as "questionsCount"
            FROM "Category" c
            LEFT JOIN "Question" q ON q."categoryId" = c.id
            GROUP BY c.id
            ORDER BY c.name ASC
          `;
        } else {
          // Se a coluna não existir, buscar apenas as categorias sem contagem
          categories = await prisma.$queryRaw`
            SELECT 
              c.id,
              c.name,
              c.description,
              c."createdAt",
              c."updatedAt",
              0 as "questionsCount"
            FROM "Category" c
            ORDER BY c.name ASC
          `;
        }
        
        // Converter BigInt para Number para evitar erro de serialização
        categories = categories.map(category => ({
          ...category,
          questionsCount: Number(category.questionsCount)
        }));
        
        console.log(`Encontradas ${Array.isArray(categories) ? categories.length : 0} categorias`);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        // Se a tabela não existir, retornar array vazio
      }

      return res.status(200).json(Array.isArray(categories) ? categories : [])
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
        // Criar categoria usando SQL direto para garantir que funcione
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "Category" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        const result = await prisma.$executeRaw`
          INSERT INTO "Category" (
            name,
            description,
            "updatedAt"
          ) VALUES (
            ${name},
            ${description || null},
            CURRENT_TIMESTAMP
          ) RETURNING id, name, description, "createdAt", "updatedAt"
        `;
        
        console.log('Resultado da inserção:', result);
        
        // Buscar a categoria recém-criada
        const newCategories = await prisma.$queryRaw`
          SELECT 
            id,
            name,
            description,
            "createdAt",
            "updatedAt"
          FROM "Category"
          WHERE name = ${name}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `;
        
        const newCategory = Array.isArray(newCategories) && newCategories.length > 0 ? newCategories[0] : null;
        console.log('Categoria criada com sucesso:', newCategory);
        
        return res.status(201).json(newCategory);
      } catch (error) {
        console.error('Erro ao executar SQL para criar categoria:', error);
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
      let questionsCount = 0;
      
      try {
        // Verificar se a coluna categoryId existe na tabela Question
        const checkColumn = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Question' AND column_name = 'categoryId'
        `;
        
        if (Array.isArray(checkColumn) && checkColumn.length > 0) {
          const result = await prisma.$queryRaw`
            SELECT CAST(COUNT(*) AS INTEGER) as count
            FROM "Question"
            WHERE "categoryId" = ${id}
          `;
          
          if (Array.isArray(result) && result.length > 0) {
            questionsCount = Number(result[0].count);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar perguntas associadas:', error);
        // Se a tabela não existir, considerar que não há perguntas associadas
      }
      
      console.log(`Número de perguntas associadas: ${questionsCount}`);
      
      if (questionsCount > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir esta categoria porque existem perguntas associadas a ela.'
        })
      }
      
      // Excluir categoria usando SQL raw
      try {
        await prisma.$executeRaw`
          DELETE FROM "Category"
          WHERE id = ${id}
        `;
        console.log(`Categoria excluída com sucesso: ${id}`);
      } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        throw error;
      }
      
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      return res.status(500).json({ error: 'Erro ao excluir categoria' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
