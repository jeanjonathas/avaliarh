import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import crypto from 'crypto';

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
        console.log('Buscando grupos de categorias para perguntas opinativas...');
        
        // Buscar todas as perguntas do tipo opinião múltipla com suas opções
        const questions = await prisma.question.findMany({
          where: {
            type: 'OPINION_MULTIPLE'
          },
          include: {
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
            if (option.categoryName && option.categoryNameUuid) {
              if (!optionsByCategory[option.categoryNameUuid]) {
                optionsByCategory[option.categoryNameUuid] = [];
                categoriesFromOptions.push({
                  id: `cat-${option.categoryName.replace(/\s+/g, '-').toLowerCase()}`,
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
        
        console.log(`Retornando ${opinionGroups.length} grupos de categorias`);
        return res.status(200).json(opinionGroups);
      } catch (error) {
        console.error('Erro ao buscar grupos de categorias:', error);
        // Retornar array vazio em caso de erro para não quebrar o front-end
        return res.status(200).json([]);
      }
    } else if (req.method === 'POST') {
      try {
        const { name, categories } = req.body;
        
        if (!name || !categories || !Array.isArray(categories) || categories.length === 0) {
          return res.status(400).json({ message: 'Nome e categorias são obrigatórios' });
        }

        // Criar uma pergunta temporária para armazenar as categorias
        // (já que não temos o modelo EmotionGroup disponível)
        const tempQuestion = await prisma.question.create({
          data: {
            text: `Grupo de categorias: ${name}`,
            type: 'OPINION_MULTIPLE',
            difficulty: 'MEDIUM',
            showResults: false
          }
        });
        
        // Criar opções para a pergunta temporária
        for (const category of categories) {
          await prisma.option.create({
            data: {
              text: category.name,
              isCorrect: true,
              questionId: tempQuestion.id,
              categoryName: category.name,
              categoryNameUuid: category.uuid || crypto.randomUUID(),
              explanation: category.description || ''
            }
          });
        }
        
        console.log('Grupo de categorias criado via pergunta temporária:', tempQuestion.id);
        
        // Retornar o grupo criado com o formato esperado pelo front-end
        return res.status(201).json({
          id: `temp-group-${tempQuestion.id}`,
          name: name,
          description: req.body.description || `Grupo de categorias: ${name}`,
          categories: categories.map(cat => ({
            id: cat.id || `cat-${cat.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: cat.name,
            description: cat.description || '',
            uuid: cat.uuid || crypto.randomUUID()
          }))
        });
      } catch (error) {
        console.error('Erro ao criar grupo de categorias:', error);
        return res.status(500).json({ message: 'Erro ao criar grupo de categorias' });
      }
    } else {
      return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro no handler de grupos de opinião:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
