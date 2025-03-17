import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'

// Definição dos papéis de usuário conforme o schema
type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Papéis permitidos para acessar este endpoint
const allowedRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`API Categories [id]: Método ${req.method} recebido para ID ${req.query.id}`);
  
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    console.log('API Categories [id]: Session:', session);
    
    if (!session) {
      console.log('API Categories [id]: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    console.log(`API Categories [id]: Papel do usuário: ${session.user.role}`);
    
    // Verifica se o usuário tem permissão
    if (!allowedRoles.includes(session.user.role as Role)) {
      const rolesMessage = allowedRoles.join(' ou ');
      console.log(`API Categories [id]: Usuário não autorizado. Papel: ${session.user.role}, Papéis permitidos: ${rolesMessage}`);
      return res.status(403).json({ 
        message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
      });
    }

    const { id } = req.query;
    
    if (typeof id !== 'string') {
      console.log('API Categories [id]: ID inválido');
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (req.method === 'GET') {
      try {
        console.log(`API Categories [id]: Buscando categoria com ID ${id}`);
        
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
          console.log(`API Categories [id]: Categoria com ID ${id} não encontrada`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Adicionar a contagem de questões ao objeto da categoria
        const categoryWithCount = {
          ...category,
          questionsCount: category._count.questions
        };

        console.log(`API Categories [id]: Categoria encontrada:`, categoryWithCount);
        return res.status(200).json(categoryWithCount);
      } catch (error) {
        console.error('API Categories [id]: Erro ao buscar categoria:', error);
        return res.status(500).json({ message: 'Erro ao buscar categoria' });
      }
    } else if (req.method === 'PUT') {
      try {
        console.log(`API Categories [id]: Atualizando categoria com ID ${id}`);
        console.log('API Categories [id]: Dados recebidos:', req.body);
        
        const { name, description } = req.body;
        
        if (!name) {
          console.log('API Categories [id]: Nome da categoria é obrigatório');
          return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
        }
        
        // Verificar se a categoria existe
        const existingCategory = await prisma.category.findUnique({
          where: { id }
        });
        
        if (!existingCategory) {
          console.log(`API Categories [id]: Categoria com ID ${id} não encontrada`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Verificar se já existe outra categoria com o mesmo nome (exceto a atual)
        const duplicateCategory = await prisma.category.findFirst({
          where: {
            name: {
              equals: name,
              mode: 'insensitive'
            },
            id: {
              not: id
            }
          }
        });
        
        if (duplicateCategory) {
          console.log(`API Categories [id]: Já existe outra categoria com o nome "${name}"`);
          return res.status(400).json({ message: 'Já existe outra categoria com este nome' });
        }
        
        // Atualizar categoria
        const updatedCategory = await prisma.category.update({
          where: { id },
          data: {
            name,
            description: description || null
          }
        });
        
        console.log(`API Categories [id]: Categoria atualizada com sucesso:`, updatedCategory);
        return res.status(200).json(updatedCategory);
      } catch (error) {
        console.error('API Categories [id]: Erro ao atualizar categoria:', error);
        return res.status(500).json({ message: 'Erro ao atualizar categoria' });
      }
    } else if (req.method === 'DELETE') {
      try {
        console.log(`API Categories [id]: Excluindo categoria com ID ${id}`);
        
        // Verificar se a categoria existe
        const category = await prisma.category.findUnique({
          where: { id },
          include: {
            _count: {
              select: { questions: true }
            }
          }
        });
        
        if (!category) {
          console.log(`API Categories [id]: Categoria com ID ${id} não encontrada`);
          return res.status(404).json({ message: 'Categoria não encontrada' });
        }
        
        // Verificar se há perguntas associadas
        if (category._count.questions > 0) {
          console.log(`API Categories [id]: Categoria tem ${category._count.questions} perguntas associadas, não pode ser excluída`);
          return res.status(400).json({ 
            message: 'Não é possível excluir esta categoria porque existem perguntas associadas a ela.' 
          });
        }
        
        // Excluir categoria
        await prisma.category.delete({
          where: { id }
        });
        
        console.log(`API Categories [id]: Categoria excluída com sucesso`);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('API Categories [id]: Erro ao excluir categoria:', error);
        return res.status(500).json({ message: 'Erro ao excluir categoria' });
      }
    } else {
      console.log(`API Categories [id]: Método ${req.method} não permitido`);
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Método ${req.method} não permitido` });
    }
  } catch (error) {
    console.error('API Categories [id]: Erro no handler principal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
