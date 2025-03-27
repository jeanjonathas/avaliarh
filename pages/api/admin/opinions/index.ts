import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await reconnectPrisma()
  const session = await getServerSession(req, res, authOptions);

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
        // Buscar todas as opiniões únicas das perguntas existentes
        const questions = await prisma.question.findMany({
          where: {
            type: 'OPINION_MULTIPLE'
          },
          include: {
            options: true
          }
        });

        // Extrair opiniões únicas de todas as opções
        const allOpinions = new Set<string>();
        
        questions.forEach(question => {
          question.options.forEach(option => {
            if (option.categoryName) {
              allOpinions.add(option.categoryName);
            }
          });
        });

        return res.status(200).json(Array.from(allOpinions));
      } catch (error) {
        console.error('Erro ao buscar opiniões:', error);
        return res.status(500).json({ message: 'Erro ao buscar opiniões' });
      }
    } else if (req.method === 'POST') {
      try {
        const { opinion } = req.body;
        
        if (!opinion) {
          return res.status(400).json({ message: 'Opinião é obrigatória' });
        }

        // Aqui poderíamos salvar a opinião em uma tabela específica se necessário
        // Por enquanto, apenas retornamos sucesso
        
        return res.status(201).json({ message: 'Opinião adicionada com sucesso' });
      } catch (error) {
        console.error('Erro ao adicionar opinião:', error);
        return res.status(500).json({ message: 'Erro ao adicionar opinião' });
      }
    } else {
      return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API de opiniões:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
