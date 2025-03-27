/// <reference types="next" />
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

// Definição dos papéis de usuário conforme o schema
type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Papéis permitidos para acessar este endpoint
const allowedRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Verifica se o usuário tem permissão
  if (!allowedRoles.includes(session.user.role as Role)) {
    const rolesMessage = allowedRoles.join(' ou ');
    console.log(`API Training Questions: Usuário não autorizado. Papel: ${session.user.role}, Papéis permitidos: ${rolesMessage}`);
    return res.status(403).json({ 
      message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
    });
  }

  if (req.method === 'GET') {
    try {
      console.log('Iniciando busca de perguntas de treinamento');
      
      // Buscar todas as perguntas de treinamento usando SQL raw
      console.log('Buscando perguntas de treinamento com SQL raw');
      
      // Buscar as perguntas
      const questionsResult = await prisma.$queryRaw`
        SELECT q.* FROM "Question" q
        WHERE q."questionType" = 'training'
        AND q."companyId" = ${session.user.companyId}
        ORDER BY q."createdAt" DESC
      `;
      
      // Verificar se o resultado é um array
      const questions = Array.isArray(questionsResult) ? questionsResult : [];
      
      // Buscar as opções para todas as perguntas
      const questionIds = questions.map(q => q.id);
      
      // Se não houver perguntas, retornar array vazio
      if (questionIds.length === 0) {
        return res.status(200).json([]);
      }
      
      // Buscar opções para todas as perguntas
      const optionsResult = await prisma.$queryRaw`
        SELECT o.* FROM "Option" o
        WHERE o."questionId" IN (${Prisma.join(questionIds)})
      `;
      
      const options = Array.isArray(optionsResult) ? optionsResult : [];
      
      // Criar um mapa de opções por questionId
      const optionsByQuestionId = options.reduce((acc, opt) => {
        if (!acc[opt.questionId]) {
          acc[opt.questionId] = [];
        }
        acc[opt.questionId].push(opt);
        return acc;
      }, {});
      
      // Buscar categorias para todas as perguntas
      const categoriesResult = await prisma.$queryRaw`
        SELECT c.*, cq."B" as "questionId" 
        FROM "Category" c
        JOIN "_CategoryToQuestion" cq ON c.id = cq."A"
        WHERE cq."B" IN (${Prisma.join(questionIds)})
      `;
      
      const categories = Array.isArray(categoriesResult) ? categoriesResult : [];
      
      // Criar um mapa de categorias por questionId
      const categoriesByQuestionId = categories.reduce((acc, cat) => {
        if (!acc[cat.questionId]) {
          acc[cat.questionId] = [];
        }
        acc[cat.questionId].push(cat);
        return acc;
      }, {});
      
      // Buscar stages para todas as perguntas
      const stageIdsSet = {};
      questions.forEach(q => {
        if (q.stageId) {
          stageIdsSet[q.stageId] = true;
        }
      });
      const stageIds = Object.keys(stageIdsSet);
      
      const stagesResult = await prisma.$queryRaw`
        SELECT s.* FROM "Stage" s
        WHERE s.id IN (${Prisma.join(stageIds)})
      `;
      
      const stages = Array.isArray(stagesResult) ? stagesResult : [];
      
      // Criar um mapa de stages por id
      const stagesById = stages.reduce((acc, stage) => {
        acc[stage.id] = stage;
        return acc;
      }, {});
      
      // Formatar as perguntas com suas relações
      const formattedQuestions = questions.map(question => {
        const questionOptions = optionsByQuestionId[question.id] || [];
        const questionCategories = categoriesByQuestionId[question.id] || [];
        const stage = stagesById[question.stageId];
        
        return {
          id: question.id,
          text: question.text,
          stageId: question.stageId,
          categoryId: questionCategories.length > 0 ? questionCategories[0].id : null,
          categoryName: questionCategories.length > 0 ? questionCategories[0].name : null,
          createdAt: new Date(question.createdAt).toISOString(),
          updatedAt: new Date(question.updatedAt).toISOString(),
          stage: {
            id: question.stageId,
            title: stage?.title || '',
            description: stage?.description || '',
            order: stage?.order || 0
          },
          category: questionCategories.length > 0 ? {
            id: questionCategories[0].id,
            name: questionCategories[0].name || '',
            description: questionCategories[0].description || ''
          } : null,
          options: questionOptions.map((option: any) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
            categoryName: option.categoryName || option.category?.name || null,
            categoryId: option.categoryId || option.category?.id || null,
            weight: option.weight || 0,
            position: option.position || 0,
            explanation: option.explanation || null
          })),
          difficulty: question.difficulty || 'MEDIUM',
          type: question.type || 'MULTIPLE_CHOICE',
          questionType: 'training' // Garantir que o tipo seja sempre 'training'
        };
      });
      
      console.log(`Retornando ${formattedQuestions.length} perguntas de treinamento formatadas`);
      return res.status(200).json(formattedQuestions);
    } catch (error) {
      console.error('Erro ao buscar perguntas de treinamento:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      console.log('Criando nova pergunta de treinamento');
      
      // Extrair dados do corpo da requisição
      const { text, stageId, categoryId, options, type, difficulty, showResults } = req.body;
      
      // Validação básica
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
        console.log('Criando nova pergunta de treinamento com SQL raw');
        
        // Gerar um UUID para a nova pergunta
        const questionId = crypto.randomUUID();
        
        // Criar a pergunta primeiro
        await prisma.$executeRaw`
          INSERT INTO "Question" (
            "id", "text", "stageId", "companyId", "difficulty", "type", 
            "questionType", "createdAt", "updatedAt", "showResults"
          ) VALUES (
            ${questionId}, ${text}, ${finalStageId}, ${session.user.companyId}, 
            ${difficulty || 'MEDIUM'}, ${type || 'MULTIPLE_CHOICE'}, 
            'training', NOW(), NOW(), ${showResults !== undefined ? showResults : true}
          )
        `;
        
        console.log('Pergunta criada com ID:', questionId);
        
        // Criar as opções
        for (const option of options) {
          const optionId = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "Option" (
              "id", "text", "isCorrect", "questionId", "weight", 
              "position", "categoryId", "createdAt", "updatedAt"
            ) VALUES (
              ${optionId}, ${option.text}, ${option.isCorrect}, 
              ${questionId}, ${option.weight || 0}, ${option.position || 0}, 
              ${option.categoryId || null}, NOW(), NOW()
            )
          `;
        }
        
        console.log('Opções criadas para a pergunta');
        
        // Conectar à categoria se fornecida
        if (categoryId) {
          await prisma.$executeRaw`
            INSERT INTO "_CategoryToQuestion" (
              "A", "B"
            ) VALUES (
              ${categoryId}, ${questionId}
            )
          `;
          console.log('Pergunta conectada à categoria:', categoryId);
        }
        
        // Buscar a pergunta criada com todas as relações
        const questionResult = await prisma.$queryRaw`
          SELECT q.* FROM "Question" q
          WHERE q.id = ${questionId}
        `;
        
        const newQuestion = Array.isArray(questionResult) && questionResult.length > 0 
          ? questionResult[0] 
          : null;
          
        if (!newQuestion) {
          throw new Error('Falha ao recuperar a pergunta criada');
        }
        
        // Buscar as opções da pergunta
        const optionsResult = await prisma.$queryRaw`
          SELECT o.* FROM "Option" o
          WHERE o.questionId = ${questionId}
        `;
        
        const questionOptions = Array.isArray(optionsResult) ? optionsResult : [];
        
        // Buscar as categorias da pergunta
        const categoriesResult = await prisma.$queryRaw`
          SELECT c.* FROM "Category" c
          JOIN "_CategoryToQuestion" cq ON c.id = cq."A"
          WHERE cq."B" = ${questionId}
        `;
        
        const categories = Array.isArray(categoriesResult) ? categoriesResult : [];
        
        // Buscar a etapa da pergunta
        const stageResult = await prisma.$queryRaw`
          SELECT s.* FROM "Stage" s
          WHERE s.id = ${finalStageId}
        `;
        
        const stage = Array.isArray(stageResult) && stageResult.length > 0 
          ? stageResult[0] 
          : null;

        // Formatar a resposta
        const formattedQuestion = {
          ...newQuestion,
          options: questionOptions,
          categories,
          stage,
          categoryInfo: categories.length > 0 ? {
            id: categories[0].id,
            name: categories[0].name,
            description: categories[0].description
          } : null,
          stageInfo: stage ? {
            id: stage.id,
            title: stage.title,
            description: stage.description
          } : null,
          categoriesInfo: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description
          })),
          optionsInfo: questionOptions.map(opt => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
            weight: opt.weight,
            position: opt.position,
            categoryId: opt.categoryId
          }))
        };

        console.log('Retornando pergunta de treinamento formatada');
        return res.status(201).json(formattedQuestion);
      } catch (error) {
        console.error('Erro ao criar pergunta de treinamento:', error);
        return res.status(500).json({ error: 'Erro ao criar pergunta de treinamento' });
      }
    } catch (error) {
      console.error('Erro no handler de POST:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  } else {
    console.log(`Método ${req.method} não permitido`);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
