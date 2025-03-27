/// <reference types="next" />
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma, reconnectPrisma } from '@/lib/prisma'

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
    console.log(`API Training Questions [id]: Usuário não autorizado. Papel: ${session.user.role}, Papéis permitidos: ${rolesMessage}`);
    return res.status(403).json({ 
      message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
    });
  }

  // Extrair o ID da pergunta da URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID da pergunta é obrigatório' });
  }

  // Processar a requisição com base no método HTTP
  if (req.method === 'GET') {
    try {
      // Usar consultas SQL raw para buscar a pergunta e suas relações
      console.log('Buscando pergunta de treinamento com SQL raw');
      
      // Buscar a pergunta pelo ID
      // Garantir que a conexão com o banco de dados esteja ativa
      await reconnectPrisma();
      const questionResult = await prisma.$queryRaw`
        SELECT q.* FROM "Question" q
        WHERE q.id = ${id}
        AND q."questionType" = 'training'
      `;
      
      const question = Array.isArray(questionResult) && questionResult.length > 0 
        ? questionResult[0] 
        : null;
        
      if (!question) {
        return res.status(404).json({ error: 'Pergunta de treinamento não encontrada' });
      }
      
      // Buscar as opções da pergunta
      const optionsResult = await prisma.$queryRaw`
        SELECT o.* FROM "Option" o
        WHERE o."questionId" = ${id}
      `;
      
      const questionOptions = Array.isArray(optionsResult) ? optionsResult : [];
      
      // Buscar as categorias da pergunta
      const categoriesResult = await prisma.$queryRaw`
        SELECT c.* FROM "Category" c
        JOIN "_CategoryToQuestion" cq ON c.id = cq."A"
        WHERE cq."B" = ${id}
      `;
      
      const categories = Array.isArray(categoriesResult) ? categoriesResult : [];
      
      // Buscar a etapa da pergunta
      const stageResult = await prisma.$queryRaw`
        SELECT s.* FROM "Stage" s
        WHERE s.id = ${question.stageId}
      `;
      
      const stage = Array.isArray(stageResult) && stageResult.length > 0 
        ? stageResult[0] 
        : null;
      
      // Formatar a resposta para incluir todas as informações necessárias
      const formattedQuestion = {
        ...question,
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
          weight: opt.weight || 0,
          position: opt.position || 0,
          categoryId: opt.categoryId
        }))
      };

      return res.status(200).json(formattedQuestion);
    } catch (error) {
      console.error('Erro ao buscar pergunta de treinamento:', error);
      return res.status(500).json({ error: 'Erro ao buscar pergunta de treinamento' });
    }
  } else if (req.method === 'PUT') {
    try {
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

      // Buscar a pergunta existente
      const questionResult = await prisma.$queryRaw`
        SELECT q.* FROM "Question" q
        WHERE q.id = ${id}
        AND q."questionType" = 'training'
      `;
      
      const question = Array.isArray(questionResult) && questionResult.length > 0 
        ? questionResult[0] 
        : null;
        
      if (!question) {
        return res.status(404).json({ error: 'Pergunta de treinamento não encontrada' });
      }
      
      // Buscar as categorias atuais da pergunta
      const categoriesResult = await prisma.$queryRaw`
        SELECT c.* FROM "Category" c
        JOIN "_CategoryToQuestion" cq ON c.id = cq."A"
        WHERE cq."B" = ${id}
      `;
      
      const existingCategories = Array.isArray(categoriesResult) ? categoriesResult : [];

      // Verificar se a etapa existe (se fornecida)
      if (stageId) {
        try {
          const stage = await prisma.stage.findUnique({
            where: { id: stageId }
          });

          if (!stage) {
            return res.status(404).json({ error: 'Etapa não encontrada' });
          }
        } catch (error) {
          console.error('Erro ao verificar etapa:', error);
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }
      }

      // Verificar se a categoria existe e é do tipo treinamento (se fornecida)
      if (categoryId) {
        const categoryResult = await prisma.$queryRaw`
          SELECT c.* FROM "Category" c
          WHERE c.id = ${categoryId}
          AND c."categoryType" = 'training'
        `;
        
        const category = Array.isArray(categoryResult) && categoryResult.length > 0 
          ? categoryResult[0] 
          : null;

        if (!category) {
          return res.status(400).json({ error: 'Categoria não encontrada ou não é uma categoria de treinamento' });
        }
      }

      // Atualizar a pergunta
      const updateData: any = {
        text,
        type: type || question.type,
        difficulty: difficulty || question.difficulty,
        showResults: showResults !== undefined ? showResults : question.showResults,
        questionType: 'training' // Garantir que o tipo seja sempre 'training'
      };

      // Adicionar stageId se fornecido
      if (stageId) {
        updateData.stageId = stageId;
      }

      // Atualizar a pergunta usando SQL raw
      await prisma.$executeRaw`
        UPDATE "Question"
        SET 
          "text" = ${text},
          "type" = ${type || question.type},
          "difficulty" = ${difficulty || question.difficulty},
          "showResults" = ${showResults !== undefined ? showResults : question.showResults},
          "stageId" = ${stageId || question.stageId},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;

      console.log('Pergunta atualizada com sucesso');

      // Atualizar as categorias
      if (categoryId) {
        // Desconectar todas as categorias existentes se houver alguma
        if (existingCategories.length > 0) {
          for (const cat of existingCategories) {
            await prisma.$executeRaw`
              DELETE FROM "_CategoryToQuestion"
              WHERE "A" = ${cat.id} AND "B" = ${id}
            `;
          }
        }

        // Conectar a nova categoria
        await prisma.$executeRaw`
          INSERT INTO "_CategoryToQuestion" ("A", "B")
          VALUES (${categoryId}, ${id})
          ON CONFLICT DO NOTHING
        `;
      }

      // Atualizar as opções
      // Primeiro, excluir todas as opções existentes
      await prisma.$executeRaw`
        DELETE FROM "Option"
        WHERE "questionId" = ${id}
      `;

      console.log('Opções anteriores excluídas');

      // Depois, criar novas opções
      for (const option of options) {
        try {
          // Gerar um ID para a nova opção
          const optionId = crypto.randomUUID();
          
          // Determinar os campos a serem usados com base no tipo de pergunta
          if (type === 'OPINION_MULTIPLE') {
            await prisma.$executeRaw`
              INSERT INTO "Option" (
                "id", "text", "isCorrect", "questionId", "weight", 
                "position", "categoryName", "categoryNameUuid", "explanation", 
                "createdAt", "updatedAt"
              ) VALUES (
                ${optionId}, ${option.text}, ${option.isCorrect}, 
                ${id}, ${option.weight || 0}, ${option.position || 0}, 
                ${option.category || null}, ${option.categoryNameUuid || null}, 
                ${option.explanation || null}, NOW(), NOW()
              )
            `;
          } else {
            await prisma.$executeRaw`
              INSERT INTO "Option" (
                "id", "text", "isCorrect", "questionId", "weight", 
                "position", "categoryId", "createdAt", "updatedAt"
              ) VALUES (
                ${optionId}, ${option.text}, ${option.isCorrect}, 
                ${id}, ${option.weight || 0}, ${option.position || 0}, 
                ${option.categoryId || null}, NOW(), NOW()
              )
            `;
          }
          
          console.log('Nova opção criada:', optionId);
        } catch (error) {
          console.error('Erro ao criar opção:', error);
          // Continuar criando as outras opções mesmo se uma falhar
        }
      }

      // Buscar a pergunta atualizada com todas as relações usando SQL raw
      const updatedQuestionResult = await prisma.$queryRaw`
        SELECT q.* FROM "Question" q
        WHERE q.id = ${id}
      `;
      
      const updatedQuestion = Array.isArray(updatedQuestionResult) && updatedQuestionResult.length > 0 
        ? updatedQuestionResult[0] 
        : null;
        
      if (!updatedQuestion) {
        throw new Error('Erro ao buscar pergunta atualizada');
      }
      
      // Buscar as opções da pergunta
      const updatedOptionsResult = await prisma.$queryRaw`
        SELECT o.* FROM "Option" o
        WHERE o."questionId" = ${id}
      `;
      
      const updatedOptions = Array.isArray(updatedOptionsResult) ? updatedOptionsResult : [];
      
      // Buscar as categorias da pergunta
      const updatedCategoriesResult = await prisma.$queryRaw`
        SELECT c.* FROM "Category" c
        JOIN "_CategoryToQuestion" cq ON c.id = cq."A"
        WHERE cq."B" = ${id}
      `;
      
      const updatedCategories = Array.isArray(updatedCategoriesResult) ? updatedCategoriesResult : [];
      
      // Buscar a etapa da pergunta
      const updatedStageResult = await prisma.$queryRaw`
        SELECT s.* FROM "Stage" s
        WHERE s.id = ${updatedQuestion.stageId}
      `;
      
      const updatedStage = Array.isArray(updatedStageResult) && updatedStageResult.length > 0 
        ? updatedStageResult[0] 
        : null;

      // Formatar a resposta para incluir todas as informações necessárias
      const formattedQuestion = {
        ...updatedQuestion,
        options: updatedOptions,
        categories: updatedCategories,
        stage: updatedStage,
        categoryInfo: updatedCategories.length > 0 ? {
          id: updatedCategories[0].id,
          name: updatedCategories[0].name,
          description: updatedCategories[0].description
        } : null,
        stageInfo: updatedStage ? {
          id: updatedStage.id,
          title: updatedStage.title,
          description: updatedStage.description
        } : null,
        categoriesInfo: updatedCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description
        })),
        optionsInfo: updatedOptions.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          weight: opt.weight || 0,
          position: opt.position || 0,
          categoryId: opt.categoryId
        }))
      };

      return res.status(200).json(formattedQuestion);
    } catch (error) {
      console.error('Erro ao atualizar pergunta de treinamento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar pergunta de treinamento' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se a pergunta existe e é do tipo treinamento usando SQL raw
      const questionResult = await prisma.$queryRaw`
        SELECT q.* FROM "Question" q
        WHERE q.id = ${id}
        AND q."questionType" = 'training'
      `;
      
      const existingQuestion = Array.isArray(questionResult) && questionResult.length > 0 
        ? questionResult[0] 
        : null;
        
      if (!existingQuestion) {
        return res.status(404).json({ error: 'Pergunta de treinamento não encontrada' });
      }
      
      // Buscar as opções da pergunta
      const optionsResult = await prisma.$queryRaw`
        SELECT o.* FROM "Option" o
        WHERE o."questionId" = ${id}
      `;
      
      // Buscar as categorias da pergunta
      const categoriesResult = await prisma.$queryRaw`
        SELECT c.* FROM "Category" c
        JOIN "_CategoryToQuestion" cq ON c.id = cq."A"
        WHERE cq."B" = ${id}
      `;

      // Excluir todas as opções da pergunta
      await prisma.$executeRaw`
        DELETE FROM "Option"
        WHERE "questionId" = ${id}
      `;
      
      // Remover relações com categorias
      await prisma.$executeRaw`
        DELETE FROM "_CategoryToQuestion"
        WHERE "B" = ${id}
      `;
      
      // Excluir a pergunta
      await prisma.$executeRaw`
        DELETE FROM "Question"
        WHERE "id" = ${id}
      `;

      return res.status(200).json({ message: 'Pergunta de treinamento excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir pergunta de treinamento:', error);
      return res.status(500).json({ error: 'Erro ao excluir pergunta de treinamento' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
