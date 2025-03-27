import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/categories/${req.query.id}`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID da categoria é obrigatório' });
    }

    // GET - Obter detalhes de uma categoria específica
    if (req.method === 'GET') {
    // Garantir que a conexão com o banco de dados esteja ativa
    await reconnectPrisma();
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          questions: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({ message: 'Categoria não encontrada' });
      }

      
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
    return res.status(200).json(category);
    }

    // PUT - Atualizar uma categoria
    if (req.method === 'PUT') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          name,
          description: description || null,
        },
      });

      
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
    return res.status(200).json(updatedCategory);
    }

    // DELETE - Excluir uma categoria
    if (req.method === 'DELETE') {
      // Verificar se a categoria está sendo usada em questões usando métodos nativos do Prisma
      const questionsCount = await prisma.category.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              questions: true
            }
          }
        }
      }).then(result => result?._count.questions || 0);

      if (questionsCount > 0) {
        return res.status(400).json({ 
          message: `Esta categoria está sendo usada em ${questionsCount} questões. Remova as questões primeiro.` 
        });
      }

      await prisma.category.delete({
        where: { id },
      });

      
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
    return res.status(200).json({ message: 'Categoria excluída com sucesso' });
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de categorias:', error);
    
    // Verificar se é um erro de registro não encontrado
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }
    
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
