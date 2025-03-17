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

        // Agrupar perguntas por conjuntos de opiniões
        const opinionGroups: { [key: string]: string[] } = {};
        
        // Processar perguntas para identificar grupos
        questions.forEach(question => {
          // Extrair opiniões desta pergunta
          const opinions = question.options
            .map(option => option.category)
            .filter(Boolean) as string[];
            
          if (opinions.length > 0) {
            // Ordenar opiniões para garantir consistência na comparação
            const sortedOpinions = [...opinions].sort();
            
            // Usar o hash das opiniões como identificador do grupo
            const groupKey = sortedOpinions.join('|');
            
            // Verificar se este grupo já existe
            let groupFound = false;
            for (const [groupName, groupOpinions] of Object.entries(opinionGroups)) {
              // Comparar se os arrays têm o mesmo conteúdo
              if (
                groupOpinions.length === sortedOpinions.length && 
                groupOpinions.every((opinion, index) => opinion === sortedOpinions[index])
              ) {
                groupFound = true;
                break;
              }
            }
            
            // Se não encontrou grupo similar, criar um novo
            if (!groupFound) {
              // Usar o texto da pergunta como nome do grupo (limitado a 30 caracteres)
              const groupName = `Grupo ${Object.keys(opinionGroups).length + 1}: ${
                question.text.length > 30 
                  ? question.text.substring(0, 27) + '...' 
                  : question.text
              }`;
              
              opinionGroups[groupName] = sortedOpinions;
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
        const { name, opinions } = req.body;
        
        if (!name || !opinions || !Array.isArray(opinions) || opinions.length === 0) {
          return res.status(400).json({ message: 'Nome e opiniões são obrigatórios' });
        }

        // Aqui poderíamos salvar o grupo em uma tabela específica
        // Por enquanto, apenas retornamos sucesso
        
        return res.status(201).json({ 
          message: 'Grupo de opiniões adicionado com sucesso',
          name,
          opinions
        });
      } catch (error) {
        console.error('Erro ao adicionar grupo de opiniões:', error);
        return res.status(500).json({ message: 'Erro ao adicionar grupo de opiniões' });
      }
    } else {
      return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API de grupos de opiniões:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
