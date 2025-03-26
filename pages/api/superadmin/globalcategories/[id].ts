import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  const { id } = req.query;

  // Verificar autenticação e permissão de superadmin
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Verificar se o ID é válido
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    // GET - Obter detalhes de uma categoria global específica
    if (req.method === 'GET') {
      const category = await prisma.globalCategory.findUnique({
        where: { id }
      });

      if (!category) {
        return res.status(404).json({ message: 'Categoria global não encontrada' });
      }

      return res.status(200).json(category);
    }

    // PUT - Atualizar uma categoria global
    if (req.method === 'PUT') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).
        json({ message: 'Nome da categoria é obrigatório' });
      }

      const updatedCategory = await prisma.globalCategory.update({
        where: { id },
        data: {
          name,
          description: description || null
        }
      });

      return res.status(200).json(updatedCategory);
    }

    // DELETE - Excluir uma categoria global
    if (req.method === 'DELETE') {
      // Verificar se a categoria está sendo usada em questões globais
      const categoryWithCount = await prisma.globalCategory.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      const questionsCount = categoryWithCount?._count?.questions || 0;

      if (questionsCount > 0) {
        return res.status(400).json({ 
          message: `Esta categoria global está sendo usada em ${questionsCount} questões globais. Remova as questões primeiro.` 
        });
      }

      // Excluir a categoria
      await prisma.globalCategory.delete({
        where: { id }
      });

      return res.status(204).send('');
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
