/// <reference types="next" />
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  if (req.method === 'GET') {
    try {
      console.log('Iniciando busca de perguntas');
      let questions = [];
      
      const { stageId, testId, categoryId, ids } = req.query;
      
      console.log('Parâmetros de busca:', { stageId, testId, categoryId, ids });
      
      try {
        if (stageId) {
          console.log(`Buscando perguntas para a etapa ${stageId}`);
          // Buscar perguntas de uma etapa específica
          questions = await prisma.question.findMany({
            where: {
              stageId: stageId
            },
            include: {
              stage: true,
              categories: true,
              options: true
            },
            orderBy: [
              { 
                stage: {
                  order: 'asc'
                }
              },
              { createdAt: 'desc' }
            ]
          });
        } else if (testId) {
          console.log(`Buscando perguntas para o teste ${testId}`);
          // Buscar perguntas de um teste específico
          // Implementar lógica específica para testes quando necessário
          questions = [];
        } else if (categoryId) {
          console.log(`Buscando perguntas para a categoria ${categoryId}`);
          // Buscar perguntas de uma categoria específica
          questions = await prisma.question.findMany({
            where: {
              categories: {
                some: {
                  id: categoryId
                }
              }
            },
            include: {
              stage: true,
              categories: true,
              options: true
            },
            orderBy: [
              { 
                stage: {
                  order: 'asc'
                }
              },
              { createdAt: 'desc' }
            ]
          });
        } else if (ids && ids.length > 0) {
          console.log(`Buscando perguntas específicas: ${ids.join(', ')}`);
          // Buscar perguntas específicas por IDs
          questions = await prisma.question.findMany({
            where: {
              id: {
                in: ids
              }
            },
            include: {
              stage: true,
              categories: true,
              options: true
            },
            orderBy: [
              { 
                stage: {
                  order: 'asc'
                }
              },
              { createdAt: 'desc' }
            ]
          });
        } else {
          console.log('Buscando todas as perguntas');
          // Obter todas as perguntas
          questions = await prisma.question.findMany({
            include: {
              stage: true,
              categories: true,
              options: true
            },
            orderBy: [
              { 
                stage: {
                  order: 'asc'
                }
              },
              { createdAt: 'desc' }
            ]
          });
        }
        console.log(`Encontradas ${questions.length} perguntas`);
      } catch (error) {
        console.error('Erro ao buscar perguntas:', error);
        // Se ocorrer um erro, retornar array vazio
        return res.status(200).json([]);
      }

      // Formatar os resultados
      console.log('Formatando resultados das perguntas');
      const formattedQuestions = questions.map((question: any) => {
        return {
          id: question.id,
          text: question.text,
          stageId: question.stageId,
          categoryId: question.categories.length > 0 ? question.categories[0].id : null,
          categoryName: question.categories.length > 0 ? question.categories[0].name : null,
          createdAt: new Date(question.createdAt).toISOString(),
          updatedAt: new Date(question.updatedAt).toISOString(),
          stage: {
            id: question.stageId,
            title: question.stage?.title || '',
            description: question.stage?.description || '',
            order: question.stage?.order || 0
          },
          category: question.categories.length > 0 ? {
            id: question.categories[0].id,
            name: question.categories[0].name || '',
            description: question.categories[0].description || ''
          } : null,
          options: question.options.map((option: any) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect
          })),
          difficulty: question.difficulty || 'MEDIUM',
          type: question.type || 'MULTIPLE_CHOICE'
        };
      });
      
      console.log(`Retornando ${formattedQuestions.length} perguntas formatadas`);
      return res.status(200).json(formattedQuestions);
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { text, stageId, categoryId, categoryUuid, options, type, difficulty, showResults } = req.body;
      
      console.log('Recebendo requisição POST para criar pergunta:', {
        text,
        stageId,
        categoryId,
        categoryUuid,
        options
      });

      // Validar dados obrigatórios
      if (!text) {
        return res.status(400).json({ error: 'Texto da pergunta é obrigatório' });
      }

      // Verificar se options é um array válido
      if (!options || !Array.isArray(options) || options.length < 2) {
        console.error('Erro: options inválido:', options);
        return res.status(400).json({ error: 'Pelo menos duas opções são necessárias e devem estar em formato de array' });
      }

      // Verificar se pelo menos uma opção está marcada como correta
      const hasCorrectOption = options.some((option: any) => option.isCorrect);
      if (!hasCorrectOption) {
        return res.status(400).json({ error: 'Pelo menos uma opção deve ser marcada como correta' });
      }

      // Verificar se a etapa existe (se fornecida)
      let finalStageId = stageId;
      if (stageId) {
        try {
          console.log('Verificando se a etapa existe:', stageId);
          const stage = await prisma.$queryRaw`
            SELECT id FROM "Stage" WHERE id = ${stageId}
          `;

          if (!Array.isArray(stage) || stage.length === 0) {
            console.log('Erro: etapa não encontrada');
            return res.status(404).json({ error: 'Etapa não encontrada' });
          }
        } catch (error) {
          console.error('Erro ao verificar etapa (tabela pode não existir):', error);
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }
      } else {
        // Se não for fornecido stageId, criar uma etapa padrão
        try {
          console.log('Criando etapa padrão para pergunta sem etapa');
          
          // Verificar se já existe uma etapa padrão
          const defaultStages = await prisma.$queryRaw`
            SELECT id FROM "Stage" WHERE title = 'Sem Etapa' LIMIT 1
          `;
          
          console.log('Etapas padrão encontradas:', defaultStages);
          
          let defaultStageId;
          
          if (Array.isArray(defaultStages) && defaultStages.length > 0) {
            defaultStageId = defaultStages[0].id;
            console.log('Usando etapa padrão existente:', defaultStageId);
          } else {
            // Criar uma etapa padrão
            console.log('Criando nova etapa padrão');
            // Gerar um UUID manualmente para a etapa
            const uuid = await prisma.$queryRaw`SELECT uuid_generate_v4() as uuid`;
            const newUuid = Array.isArray(uuid) && uuid.length > 0 ? uuid[0].uuid : null;
            
            if (!newUuid) {
              console.log('Erro: não foi possível gerar UUID para etapa padrão');
              return res.status(500).json({ error: 'Erro ao criar etapa padrão' });
            }
            
            console.log('UUID gerado para etapa padrão:', newUuid);
            
            const newStageId = await prisma.$queryRaw`
              INSERT INTO "Stage" (id, title, description, "order", "createdAt", "updatedAt")
              VALUES (${newUuid}, 'Sem Etapa', 'Etapa padrão para perguntas sem etapa específica', 9999, NOW(), NOW())
              RETURNING id
            `;
            
            console.log('Nova etapa padrão criada:', newStageId);
            
            if (Array.isArray(newStageId) && newStageId.length > 0) {
              defaultStageId = newStageId[0].id;
              console.log('ID da etapa padrão criada:', defaultStageId);
            } else {
              console.log('Erro: não foi possível criar etapa padrão');
              return res.status(500).json({ error: 'Erro ao criar etapa padrão' });
            }
          }
          
          // Usar a etapa padrão
          finalStageId = defaultStageId;
          console.log('Usando stageId padrão:', finalStageId);
        } catch (error) {
          console.error('Erro ao criar/buscar etapa padrão:', error);
          return res.status(500).json({ error: 'Erro ao processar etapa para a pergunta' });
        }
      }

      // Verificar se a categoria existe (se fornecida)
      let finalCategoryId = null;
      if (categoryId || categoryUuid) {
        try {
          const categoryToCheck = categoryId || categoryUuid;
          console.log('Verificando se a categoria existe:', categoryToCheck);
          
          // Verificar se o categoryId/categoryUuid é um UUID válido
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryToCheck);
          
          if (!isValidUuid) {
            console.error('UUID de categoria inválido:', categoryToCheck);
            return res.status(400).json({ error: 'UUID de categoria inválido' });
          }
          
          // Usar Prisma Client em vez de SQL raw para verificar a categoria
          const category = await prisma.category.findUnique({
            where: { id: categoryToCheck }
          });

          console.log('Resultado da consulta de categoria:', category);

          if (!category) {
            console.log('Erro: categoria não encontrada');
            return res.status(404).json({ error: 'Categoria não encontrada' });
          }
          
          finalCategoryId = categoryToCheck;
          console.log('Categoria válida encontrada:', finalCategoryId);
        } catch (error) {
          console.error('Erro ao verificar categoria:', error);
          return res.status(500).json({ error: 'Erro ao verificar categoria' });
        }
      }

      try {
        console.log('Criando pergunta com os seguintes dados:', {
          text,
          stageId: finalStageId,
          categoryId: finalCategoryId
        });

        // Criar pergunta usando o Prisma Client em vez de SQL raw
        const newQuestion = await prisma.question.create({
          data: {
            text,
            stageId: finalStageId,
            type: (type || 'MULTIPLE_CHOICE') as any,
            difficulty: (difficulty || 'MEDIUM') as any,
            showResults: showResults !== undefined ? showResults : true,
            // Definir apenas a relação categories, não usar categoryId diretamente
            ...(finalCategoryId ? {
              categories: {
                connect: [{ id: finalCategoryId }]
              }
            } : {})
          },
          include: {
            categories: true,
            stage: true,
            options: true
          }
        });

        console.log('Pergunta criada com sucesso:', newQuestion.id);
        console.log('Categorias conectadas:', newQuestion.categories);
        
        // Criar opções usando o Prisma Client
        const createdOptions = [];
        for (const option of options) {
          console.log('Inserindo opção:', option);
          const newOption = await prisma.option.create({
            data: {
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: newQuestion.id,
            }
          });
          createdOptions.push(newOption);
          console.log('Opção criada com sucesso:', newOption.id);
        }
        
        // Buscar a pergunta completa com suas relações
        const questionWithRelations = await prisma.question.findUnique({
          where: { id: newQuestion.id },
          include: {
            options: true,
            stage: true,
            categories: true
          }
        });
        
        if (!questionWithRelations) {
          console.log('Erro: não foi possível buscar a pergunta criada');
          return res.status(500).json({ error: 'Erro ao buscar pergunta criada' });
        }

        // Serializar os dados para evitar problemas com BigInt
        const serializedQuestion = {
          id: questionWithRelations.id.toString(),
          text: questionWithRelations.text,
          stageId: questionWithRelations.stageId,
          categoryId: questionWithRelations.categories.length > 0 ? questionWithRelations.categories[0].id : null,
          categoryName: questionWithRelations.categories.length > 0 ? questionWithRelations.categories[0].name : null,
          createdAt: new Date(questionWithRelations.createdAt).toISOString(),
          updatedAt: new Date(questionWithRelations.updatedAt).toISOString(),
          options: Array.isArray(questionWithRelations.options) ? questionWithRelations.options.map((option: any) => ({
            id: option.id.toString(),
            text: option.text,
            isCorrect: option.isCorrect,
            createdAt: new Date(option.createdAt).toISOString(),
            updatedAt: new Date(option.updatedAt).toISOString(),
          })) : [],
          stage: {
            id: questionWithRelations.stageId,
            title: questionWithRelations.stage.title,
            description: questionWithRelations.stage.description || '',
            order: questionWithRelations.stage.order,
          },
          category: questionWithRelations.categories.length > 0 ? {
            id: questionWithRelations.categories[0].id,
            name: questionWithRelations.categories[0].name || '',
            description: questionWithRelations.categories[0].description || '',
          } : null,
        };

        return res.status(201).json(serializedQuestion);
      } catch (error) {
        console.error('Erro ao criar pergunta:', error);
        return res.status(500).json({ error: 'Erro ao criar pergunta' });
      }
    } catch (error) {
      console.error('Erro ao criar pergunta:', error);
      return res.status(500).json({ error: 'Erro ao criar pergunta' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
