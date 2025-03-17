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
        console.log('Buscando grupos de emoções para perguntas opinativas...');
        
        // Verificar se o modelo EmotionGroup está disponível no Prisma Client
        let emotionGroups = [];
        
        try {
          // Tentar buscar grupos de emoções do banco de dados
          if (prisma.emotionGroup) {
            emotionGroups = await prisma.emotionGroup.findMany({
              include: {
                questions: {
                  include: {
                    options: true
                  }
                }
              }
            });
            
            console.log(`Encontrados ${emotionGroups.length} grupos de emoções no banco de dados`);
          } else {
            console.log('Modelo EmotionGroup não disponível no Prisma Client');
          }
        } catch (error) {
          console.log('Erro ao buscar grupos de emoções, usando método alternativo:', error);
          // Continuar com o método alternativo
        }

        // Se conseguiu buscar grupos de emoções e encontrou algum, formatar para a resposta
        if (emotionGroups && emotionGroups.length > 0) {
          // Formatar grupos para a resposta
          const formattedGroups = emotionGroups.map(group => {
            // Extrair categorias únicas das opções de todas as perguntas do grupo
            const categories = new Map();
            
            group.questions.forEach(question => {
              question.options.forEach(option => {
                if (option.categoryNameUuid && option.categoryName) {
                  categories.set(option.categoryNameUuid, {
                    id: option.categoryId || `cat-${option.categoryName.replace(/\s+/g, '-').toLowerCase()}`,
                    name: option.categoryName,
                    description: option.explanation || '',
                    uuid: option.categoryNameUuid
                  });
                }
              });
            });
            
            return {
              id: group.id,
              name: group.name,
              description: group.description,
              categories: Array.from(categories.values())
            };
          });
          
          console.log(`Retornando ${formattedGroups.length} grupos de emoções`);
          return res.status(200).json(formattedGroups);
        }

        // Se não houver grupos no banco, buscar grupos a partir das perguntas (método antigo)
        console.log('Nenhum grupo de emoções encontrado no banco, buscando a partir das perguntas...');
        
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
          
          // Agrupar opções por categoria usando categoryNameUuid
          for (const option of question.options) {
            if (option.categoryName && option.categoryNameUuid) {
              if (!optionsByCategory[option.categoryNameUuid]) {
                optionsByCategory[option.categoryNameUuid] = [];
                categoriesFromOptions.push({
                  id: option.categoryId || `cat-${option.categoryName.replace(/\s+/g, '-').toLowerCase()}`,
                  name: option.categoryName,
                  description: option.explanation || '',
                  uuid: option.categoryNameUuid
                });
              }
              optionsByCategory[option.categoryNameUuid].push(option);
            }
          }
          
          // Se encontrou categorias nas opções, criar um grupo
          if (categoriesFromOptions.length > 0) {
            processedQuestionIds.add(question.id);
            
            // Verificar se já existe um grupo similar usando UUIDs
            const existingGroupIndex = opinionGroups.findIndex(group => 
              group.categories.length === categoriesFromOptions.length && 
              group.categories.every((cat, idx) => 
                cat.uuid === categoriesFromOptions[idx].uuid
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
        
        console.log(`Retornando ${opinionGroups.length} grupos de categorias (método antigo)`);
        return res.status(200).json(opinionGroups);
      } catch (error) {
        console.error('Erro ao buscar grupos de emoções:', error);
        // Retornar array vazio em caso de erro para não quebrar o front-end
        return res.status(200).json([]);
      }
    } else if (req.method === 'POST') {
      try {
        const { name, categories } = req.body;
        
        if (!name || !categories || !Array.isArray(categories) || categories.length === 0) {
          return res.status(400).json({ message: 'Nome e categorias são obrigatórios' });
        }

        // Criar grupo de emoções no banco de dados
        let newGroup;
        
        try {
          if (prisma.emotionGroup) {
            newGroup = await prisma.emotionGroup.create({
              data: {
                name,
                description: req.body.description || `Grupo de emoções: ${name}`
              }
            });
          } else {
            console.log('Modelo EmotionGroup não disponível no Prisma Client');
            return res.status(500).json({ message: 'Erro ao criar grupo de emoções' });
          }
        } catch (error) {
          console.error('Erro ao criar grupo de emoções:', error);
          return res.status(500).json({ message: 'Erro ao criar grupo de emoções' });
        }
        
        console.log('Grupo de emoções criado:', newGroup);
        
        // Retornar o grupo criado com o formato esperado pelo front-end
        return res.status(201).json({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          categories: categories.map(cat => ({
            id: cat.id || `cat-${cat.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: cat.name,
            description: cat.description || '',
            uuid: cat.uuid
          }))
        });
      } catch (error) {
        console.error('Erro ao adicionar grupo de emoções:', error);
        return res.status(500).json({ message: 'Erro ao adicionar grupo de emoções' });
      }
    } else {
      return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro no handler de grupos de emoções:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
