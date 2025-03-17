/// <reference types="next" />
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import crypto from 'crypto';

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
          const stage = await prisma.stage.findUnique({
            where: { id: stageId }
          });

          if (!stage) {
            console.log('Erro: etapa não encontrada');
            return res.status(404).json({ error: 'Etapa não encontrada' });
          }
        } catch (error) {
          console.error('Erro ao verificar etapa:', error);
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }
      } else {
        // Se não for fornecido stageId, criar uma etapa padrão
        try {
          console.log('Criando etapa padrão para pergunta sem etapa');
          
          // Verificar se já existe uma etapa padrão
          const defaultStages = await prisma.stage.findMany({
            where: { title: 'Sem Etapa' }
          });
          
          console.log('Etapas padrão encontradas:', defaultStages);
          
          let defaultStageId;
          
          if (defaultStages.length > 0) {
            defaultStageId = defaultStages[0].id;
            console.log('Usando etapa padrão existente:', defaultStageId);
          } else {
            // Criar uma etapa padrão
            console.log('Criando nova etapa padrão');
            // Gerar um UUID usando o módulo crypto do Node.js
            const newUuid = crypto.randomUUID();
            
            console.log('UUID gerado para etapa padrão:', newUuid);
            
            const newStageId = await prisma.stage.create({
              data: {
                id: newUuid,
                title: 'Sem Etapa',
                description: 'Etapa padrão para perguntas sem etapa específica',
                order: 9999,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              select: {
                id: true
              }
            });
            
            console.log('Nova etapa padrão criada:', newStageId);
            
            if (newStageId && newStageId.id) {
              defaultStageId = newStageId.id;
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
      let finalCategoryId = categoryId;
      if (categoryId) {
        try {
          console.log('Verificando se a categoria existe:', categoryId);
          const category = await prisma.category.findUnique({
            where: { id: categoryId }
          });

          if (!category) {
            console.log('Erro: categoria não encontrada');
            return res.status(404).json({ error: 'Categoria não encontrada' });
          }
        } catch (error) {
          console.error('Erro ao verificar categoria:', error);
          return res.status(404).json({ error: 'Categoria não encontrada' });
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
        
        // Criar opções para a pergunta
        console.log('Criando opções para a pergunta:', options);
        
        for (const option of options) {
          console.log('Criando opção:', option);
          
          try {
            // Determinar os campos a serem usados com base no tipo de pergunta
            const optionData = {
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: newQuestion.id,
              weight: option.weight || 0
            };
            
            // Adicionar campos específicos para perguntas opinativas
            if (type === 'OPINION_MULTIPLE') {
              Object.assign(optionData, {
                categoryName: option.category || null,
                categoryNameUuid: option.categoryNameUuid || null,
                explanation: option.explanation || null,
                position: option.position || 0
              });
            } else if (option.categoryId) {
              // Para perguntas não opinativas, manter o categoryId se existir
              Object.assign(optionData, {
                categoryId: option.categoryId
              });
            }
            
            // Criar opção com os campos apropriados
            const newOption = await prisma.option.create({
              data: optionData
            });
            
            console.log('Opção criada:', newOption);
          } catch (error) {
            console.error('Erro ao criar opção:', error);
            // Continuar criando as outras opções mesmo se uma falhar
          }
        }
        
        // Buscar a pergunta completa com suas relações
        const questionWithRelations = await prisma.question.findUnique({
          where: {
            id: newQuestion.id
          },
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
          type: questionWithRelations.type,
          difficulty: questionWithRelations.difficulty,
          showResults: questionWithRelations.showResults,
          options: Array.isArray(questionWithRelations.options) ? questionWithRelations.options.map((option: any) => ({
            id: option.id.toString(),
            text: option.text,
            isCorrect: option.isCorrect,
            weight: option.weight || 0,
            position: option.position || 0,
            categoryName: option.categoryName || null,
            categoryNameUuid: option.categoryNameUuid || null,
            explanation: option.explanation || null
          })) : [],
          stage: {
            id: questionWithRelations.stageId,
            title: questionWithRelations.stage.title,
            description: questionWithRelations.stage.description || '',
          },
          category: questionWithRelations.categories.length > 0 ? {
            id: questionWithRelations.categories[0].id,
            name: questionWithRelations.categories[0].name || '',
            description: questionWithRelations.categories[0].description || '',
          } : null
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
