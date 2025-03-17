import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../lib/prisma';

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

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Lidar com diferentes métodos HTTP
    if (req.method === 'GET') {
      try {
        // Buscar todas as perguntas do tipo opinião
        const questions = await prisma.question.findMany({
          where: {
            type: 'OPINION_MULTIPLE'
          },
          include: {
            options: true
          }
        });

        // Criar grupos de opiniões no formato necessário para o componente OpinionQuestionWizard
        const opinionGroups = [];
        
        // Processar perguntas para identificar grupos
        questions.forEach(question => {
          // Extrair categorias desta pergunta
          const categories = question.options
            .map(option => ({
              id: option.id,
              name: option.category || '',
              description: option.explanation || ''
            }))
            .filter(cat => cat.name); // Filtrar categorias vazias
            
          if (categories.length > 0) {
            // Verificar se este grupo já existe
            const existingGroupIndex = opinionGroups.findIndex(group => 
              group.categories.length === categories.length && 
              group.categories.every((cat, idx) => 
                cat.name === categories[idx].name
              )
            );
            
            // Se não encontrou grupo similar, criar um novo
            if (existingGroupIndex === -1) {
              opinionGroups.push({
                id: `group-${opinionGroups.length + 1}`,
                name: `Grupo ${opinionGroups.length + 1}: ${
                  question.text.length > 30 
                    ? question.text.substring(0, 27) + '...' 
                    : question.text
                }`,
                categories: categories
              });
            }
          }
        });

        return res.status(200).json(opinionGroups);
      } catch (error) {
        console.error('Erro ao buscar grupos de opiniões:', error);
        return res.status(500).json({ message: 'Erro ao buscar grupos de opiniões' });
      }
    } else if (req.method === 'POST') {
      try {
        const { name, categories } = req.body;
        
        if (!name || !categories || !Array.isArray(categories) || categories.length === 0) {
          return res.status(400).json({ message: 'Nome e categorias são obrigatórios' });
        }

        // Aqui poderíamos salvar o grupo em uma tabela específica
        // Por enquanto, apenas retornamos sucesso
        
        return res.status(201).json({ 
          message: 'Grupo de opiniões adicionado com sucesso',
          id: `group-${Date.now()}`,
          name,
          categories
        });
      } catch (error) {
        console.error('Erro ao adicionar grupo de opiniões:', error);
        return res.status(500).json({ message: 'Erro ao adicionar grupo de opiniões' });
      }
    } else {
      return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro no handler de grupos de opiniões:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
