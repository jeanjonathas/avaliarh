import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Lidar com diferentes métodos HTTP
    if (req.method === 'GET') {
      try {
        console.log('Buscando grupos de categorias de perguntas opinativas...');
        
        // Buscar todas as perguntas do tipo opinião com suas opções
        const questions = await prisma.question.findMany({
          where: {
            type: 'OPINION_MULTIPLE'
          },
          include: {
            categories: true,
            options: true
          }
        });

        console.log(`Encontradas ${questions.length} perguntas opinativas`);

        // Criar grupos de categorias
        const opinionGroups = [];
        const processedQuestionIds = new Set();
        
        // Processar perguntas para identificar grupos únicos de categorias
        for (const question of questions) {
          // Pular perguntas já processadas
          if (processedQuestionIds.has(question.id)) continue;
          
          // Extrair categorias das opções
          const categoriesFromOptions = [];
          const optionsByCategory = {};
          
          // Agrupar opções por categoria
          for (const option of question.options) {
            if (option.category) {
              if (!optionsByCategory[option.category]) {
                optionsByCategory[option.category] = [];
                categoriesFromOptions.push({
                  id: `cat-${option.category.replace(/\s+/g, '-').toLowerCase()}`,
                  name: option.category,
                  description: ''
                });
              }
              optionsByCategory[option.category].push(option);
            }
          }
          
          // Se encontrou categorias nas opções, criar um grupo
          if (categoriesFromOptions.length > 0) {
            processedQuestionIds.add(question.id);
            
            // Verificar se já existe um grupo similar
            const existingGroupIndex = opinionGroups.findIndex(group => 
              group.categories.length === categoriesFromOptions.length && 
              group.categories.every((cat, idx) => 
                cat.name === categoriesFromOptions[idx].name
              )
            );
            
            // Se não encontrou grupo similar, criar um novo
            if (existingGroupIndex === -1) {
              const groupName = `Grupo: ${categoriesFromOptions.map(c => c.name).join(', ')}`;
              
              opinionGroups.push({
                id: `group-${opinionGroups.length + 1}`,
                name: groupName,
                categories: categoriesFromOptions
              });
              
              console.log(`Adicionado grupo de categorias: ${groupName}`);
            }
          }
        }

        console.log(`Retornando ${opinionGroups.length} grupos de categorias`);
        return res.status(200).json(opinionGroups);
      } catch (error) {
        console.error('Erro ao buscar grupos de categorias:', error);
        return res.status(500).json({ message: 'Erro ao buscar grupos de categorias' });
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
    console.error('Erro no handler de grupos de categorias:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
