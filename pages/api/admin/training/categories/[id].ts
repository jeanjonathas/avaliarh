import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma, reconnectPrisma } from '@/lib/prisma'

// Definição dos papéis de usuário conforme o schema
type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Papéis permitidos para acessar este endpoint
const allowedRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`API Training Categories [id]: Método ${req.method} recebido para ID ${req.query.id}`);
  
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    console.log('API Training Categories [id]: Session:', session);
    
    if (!session) {
      console.log('API Training Categories [id]: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    console.log(`API Training Categories [id]: Papel do usuário: ${session.user.role}`);
    
    // Verifica se o usuário tem permissão
    if (!allowedRoles.includes(session.user.role as Role)) {
      const rolesMessage = allowedRoles.join(' ou ');
      console.log(`API Training Categories [id]: Usuário não autorizado. Papel: ${session.user.role}, Papéis permitidos: ${rolesMessage}`);
      return res.status(403).json({ 
        message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
      });
    }

    const { id } = req.query;
    
    if (typeof id !== 'string') {
      console.log('API Training Categories [id]: ID inválido');
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (req.method === 'GET') {
      try {
        console.log(`API Training Categories [id]: Buscando categoria com ID ${id}`);
        
        // Buscar a categoria pelo ID usando SQL raw
        const categoryResult = await prisma.$queryRaw`
          SELECT c.* FROM "Category" c
          WHERE c.id = ${id}
          AND c."categoryType" = 'training'
        `;
        
        const category = Array.isArray(categoryResult) && categoryResult.length > 0 
          ? categoryResult[0] 
          : null;
        
        if (!category) {
          console.log(`API Training Categories [id]: Categoria com ID ${id} não encontrada`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Contar o número de perguntas associadas à categoria
        const questionsCountResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "_CategoryToQuestion" cq
          WHERE cq."A" = ${id}
        `;
        
        const questionsCount = Array.isArray(questionsCountResult) && questionsCountResult.length > 0 
          ? Number(questionsCountResult[0].count) 
          : 0;
        
        // Formatar a resposta
        const formattedCategory = {
          id: category.id,
          name: category.name,
          description: category.description,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          questionsCount: questionsCount,
          categoryType: 'training'
        };

        console.log(`API Training Categories [id]: Categoria encontrada:`, formattedCategory);
        return res.status(200).json(formattedCategory);
      } catch (error) {
        console.error('API Training Categories [id]: Erro ao buscar categoria:', error);
        return res.status(500).json({ message: 'Erro ao buscar categoria' });
      }
    } else if (req.method === 'PUT') {
      try {
        const { name, description } = req.body;
        
        if (!name) {
          return res.status(400).json({ message: 'Nome é obrigatório' });
        }
        
        // Verificar se a categoria existe usando SQL raw
        const categoryResult = await prisma.$queryRaw`
          SELECT c.* FROM "Category" c
          WHERE c.id = ${id}
          AND c."categoryType" = 'training'
        `;
        
        const category = Array.isArray(categoryResult) && categoryResult.length > 0 
          ? categoryResult[0] 
          : null;
        
        if (!category) {
          console.log(`API Training Categories [id]: Categoria com ID ${id} não encontrada para atualização`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Atualizar a categoria usando SQL raw
        await prisma.$executeRaw`
          UPDATE "Category"
          SET 
            "name" = ${name},
            "description" = ${description || category.description},
            "updatedAt" = NOW()
          WHERE "id" = ${id}
        `;
        
        // Buscar a categoria atualizada
        const updatedCategoryResult = await prisma.$queryRaw`
          SELECT c.* FROM "Category" c
          WHERE c.id = ${id}
        `;
        
        const updatedCategory = Array.isArray(updatedCategoryResult) && updatedCategoryResult.length > 0 
          ? updatedCategoryResult[0] 
          : null;
        
        // Contar o número de perguntas associadas à categoria
        const questionsCountResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "_CategoryToQuestion" cq
          WHERE cq."A" = ${id}
        `;
        
        const questionsCount = Array.isArray(questionsCountResult) && questionsCountResult.length > 0 
          ? Number(questionsCountResult[0].count) 
          : 0;
        
        // Formatar a resposta
        const formattedCategory = {
          id: updatedCategory.id,
          name: updatedCategory.name,
          description: updatedCategory.description,
          createdAt: updatedCategory.createdAt,
          updatedAt: updatedCategory.updatedAt,
          questionsCount: questionsCount,
          categoryType: 'training'
        };

        console.log(`API Training Categories [id]: Categoria atualizada com sucesso:`, formattedCategory);
        return res.status(200).json(formattedCategory);
      } catch (error) {
        console.error('API Training Categories [id]: Erro ao atualizar categoria:', error);
        return res.status(500).json({ message: 'Erro ao atualizar categoria' });
      }
    } else if (req.method === 'DELETE') {
      try {
        console.log(`API Training Categories [id]: Excluindo categoria com ID ${id}`);
        
        // Verificar se a categoria existe usando SQL raw
        const categoryResult = await prisma.$queryRaw`
          SELECT c.* FROM "Category" c
          WHERE c.id = ${id}
          AND c."categoryType" = 'training'
        `;
        
        const category = Array.isArray(categoryResult) && categoryResult.length > 0 
          ? categoryResult[0] 
          : null;
        
        if (!category) {
          console.log(`API Training Categories [id]: Categoria com ID ${id} não encontrada para exclusão`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Verificar se há perguntas associadas à categoria
        const questionsCountResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "_CategoryToQuestion" cq
          WHERE cq."A" = ${id}
        `;
        
        const questionsCount = Array.isArray(questionsCountResult) && questionsCountResult.length > 0 
          ? Number(questionsCountResult[0].count) 
          : 0;
        
        // Verificar se há perguntas associadas
        if (questionsCount > 0) {
          console.log(`API Training Categories [id]: Categoria tem ${questionsCount} perguntas associadas, não pode ser excluída`);
          return res.status(400).json({ 
            message: 'Não é possível excluir esta categoria porque existem perguntas associadas a ela.' 
          });
        }
        
        // Excluir categoria usando SQL raw
        await prisma.$executeRaw`
          DELETE FROM "Category"
          WHERE "id" = ${id}
        `;
        
        console.log(`API Training Categories [id]: Categoria excluída com sucesso`);
        return res.status(200).json({ message: 'Categoria excluída com sucesso' });
      } catch (error) {
        console.error('API Training Categories [id]: Erro ao excluir categoria:', error);
        return res.status(500).json({ message: 'Erro ao excluir categoria' });
      }
    } else {
      console.log(`API Training Categories [id]: Método ${req.method} não permitido`);
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Método ${req.method} não permitido` });
    }
  } catch (error) {
    console.error('API Training Categories [id]: Erro no handler principal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
