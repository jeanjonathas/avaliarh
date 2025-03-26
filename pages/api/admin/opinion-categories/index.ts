import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession({ req });

    // Verificar autenticação
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Verificar se o usuário é administrador
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true },
    });

    if (!user || user.role !== 'COMPANY_ADMIN') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Lidar com diferentes métodos HTTP
    if (req.method === 'GET') {
      try {
        // Buscar todas as categorias de opinião únicas das perguntas existentes
        const questions = await prisma.question.findMany({
          where: {
            type: 'OPINION_MULTIPLE'
          },
          include: {
            options: true
          }
        });

        // Extrair categorias únicas de todas as opções
        const allCategories = new Set<string>();
        
        questions.forEach(question => {
          question.options.forEach(option => {
            if (option.categoryName) {
              allCategories.add(option.categoryName);
            }
          });
        });

        return res.status(200).json(Array.from(allCategories));
      } catch (error) {
        console.error('Erro ao buscar categorias de opinião:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias de opinião' });
      }
    } else if (req.method === 'POST') {
      try {
        const { category } = req.body;
        
        if (!category) {
          return res.status(400).json({ message: 'Categoria é obrigatória' });
        }

        // Aqui poderíamos salvar a categoria em uma tabela específica se necessário
        // Por enquanto, apenas retornamos sucesso
        
        return res.status(201).json({ message: 'Categoria adicionada com sucesso' });
      } catch (error) {
        console.error('Erro ao adicionar categoria de opinião:', error);
        return res.status(500).json({ message: 'Erro ao adicionar categoria de opinião' });
      }
    } else {
      return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API de categorias de opinião:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
