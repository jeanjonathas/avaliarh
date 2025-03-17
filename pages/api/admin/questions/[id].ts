/// <reference types="next" />
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  
  console.log('Session:', JSON.stringify(session, null, 2));
  
  if (!session) {
    return res.status(401).json({ 
      error: 'Não autorizado', 
      message: 'Você precisa estar autenticado para realizar esta ação' 
    })
  }
  
  console.log('User role:', session.user?.role);
  console.log('User role type:', typeof session.user?.role);
  
  // Verificar se o papel do usuário é um dos papéis de administrador
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'];
  if (!session.user?.role || !adminRoles.includes(session.user.role)) {
    return res.status(403).json({ 
      error: 'Acesso negado', 
      message: 'Apenas administradores podem realizar esta ação' 
    })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  console.log(`[${req.method}] /api/admin/questions/${id}`);

  if (req.method === 'PUT') {
    // Validação das entradas
    const { text, stageId, categoryId, options } = req.body
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Texto da pergunta é obrigatório' })
    }
    
    if (!stageId || stageId.trim() === '') {
      return res.status(400).json({ error: 'Etapa é obrigatória' })
    }
    
    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Pelo menos duas opções são necessárias' })
    }
    
    if (!options.some(option => option.isCorrect)) {
      return res.status(400).json({ error: 'Pelo menos uma opção deve ser marcada como correta' })
    }
    
    console.log('Atualizando a pergunta com os seguintes valores:');
    console.log('ID:', id);
    console.log('Text:', text);
    console.log('StageId:', stageId);
    console.log('CategoryId:', categoryId);
    console.log('CategoryId é nulo ou vazio?', !categoryId || categoryId.trim() === '');

    try {
      // Verificações básicas
      const questionExists = await prisma.question.findUnique({
        where: { id }
      });
      
      if (!questionExists) {
        return res.status(404).json({ error: 'Pergunta não encontrada' });
      }
      
      const stage = await prisma.stage.findUnique({
        where: { id: stageId }
      });
      
      if (!stage) {
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }
      
      // Vamos usar a abordagem mais direta possível para resolver o problema
      // Converter todos os UUIDs para texto nas consultas SQL
      
      // 1. Atualizar os campos básicos da pergunta
      const textQuery = `
        UPDATE "Question"
        SET text = '${text}', "updatedAt" = NOW()
        WHERE id::text = '${id}'
      `;
      await prisma.$executeRawUnsafe(textQuery);
      
      // 2. Atualizar a etapa da pergunta
      await prisma.$executeRaw`
        UPDATE "Question"
        SET "stageId" = ${stageId}
        WHERE id = ${id}
      `;
      
      // 3. Atualizar a categoria
      if (categoryId) {
        await prisma.$executeRaw`
          UPDATE "Question"
          SET "categoryId" = ${categoryId}
          WHERE id = ${id}
        `;
      } else {
        // Se não houver categoria, definir como NULL
        await prisma.$executeRaw`
          UPDATE "Question"
          SET "categoryId" = NULL
          WHERE id = ${id}
        `;
      }
      
      // 4. Excluir opções existentes
      await prisma.$executeRaw`
        DELETE FROM "Option"
        WHERE "questionId" = ${id}
      `;
      
      // 5. Inserir novas opções
      if (Array.isArray(options) && options.length > 0) {
        for (const option of options) {
          await prisma.option.create({
            data: {
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: id,
              updatedAt: new Date()
            }
          });
        }
      }
      
      // Buscar a pergunta atualizada com suas relações
      const questionQuery = `
        SELECT 
          q.id, 
          q.text, 
          q."stageId",
          q."categoryId",
          s.id as "stage_id",
          s.title as "stage_title",
          s.description as "stage_description",
          s.order as "stage_order",
          c.id as "category_id",
          c.name as "category_name",
          c.description as "category_description"
        FROM "Question" q
        LEFT JOIN "Stage" s ON q."stageId" = s.id
        LEFT JOIN "Category" c ON q."categoryId" = c.id
        WHERE q.id = '${id}'
      `;
      
      const optionsQuery = `
        SELECT id, text, "isCorrect", "createdAt", "updatedAt"
        FROM "Option"
        WHERE "questionId" = '${id}'
      `;
      
      const questionResult = await prisma.$queryRawUnsafe(questionQuery);
      const optionsResult = await prisma.$queryRawUnsafe(optionsQuery);
      
      if (!questionResult || !Array.isArray(questionResult) || questionResult.length === 0) {
        return res.status(500).json({ error: 'Falha ao recuperar a pergunta atualizada' });
      }

      // Definir interface para o tipo do resultado da query
      interface QuestionQueryResult {
        id: string;
        text: string;
        stageId: string;
        categoryId: string | null;
        stage_id: string;
        stage_title: string;
        stage_description: string | null;
        stage_order: number | null;
        category_id: string | null;
        category_name: string | null;
        category_description: string | null;
      }

      // Usar asserção de tipo
      const question = questionResult[0] as QuestionQueryResult;
      const optionsList = Array.isArray(optionsResult) ? optionsResult : [];

      // Formatar a resposta
      const formattedQuestion = {
        id: question.id,
        text: question.text,
        stageId: question.stageId,
        categoryId: question.category_id || null,
        categoryUuid: question.category_id || null, 
        options: optionsList.map(option => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          createdAt: new Date(option.createdAt).toISOString(),
          updatedAt: new Date(option.updatedAt).toISOString()
        })),
        stage: {
          id: question.stage_id,
          title: question.stage_title,
          description: question.stage_description === null ? '' : question.stage_description,
          order: question.stage_order || 0
        },
        category: question.category_id ? {
          id: question.category_id,
          name: question.category_name === null ? '' : question.category_name,
          description: question.category_description === null ? '' : question.category_description
        } : null
      };

      console.assert(typeof question.id === 'string', 'question.id deve ser uma string');
      console.assert(typeof question.text === 'string', 'question.text deve ser uma string');
      console.assert(typeof question.stageId === 'string', 'question.stageId deve ser uma string');
      console.assert(typeof question.category_id === 'string' || question.category_id === null, 'question.category_id deve ser uma string ou null');
      console.assert(typeof question.stage_id === 'string', 'question.stage_id deve ser uma string');
      console.assert(typeof question.stage_title === 'string', 'question.stage_title deve ser uma string');
      console.assert(typeof question.stage_description === 'string', 'question.stage_description deve ser uma string');
      console.assert(typeof question.stage_order === 'number', 'question.stage_order deve ser um número');
      console.assert(typeof question.category_id === 'string' || question.category_id === null, 'question.category_id deve ser uma string ou null');
      console.assert(typeof question.category_name === 'string', 'question.category_name deve ser uma string');
      console.assert(typeof question.category_description === 'string', 'question.category_description deve ser uma string');

      console.log('API retornando pergunta formatada:', {
        id: formattedQuestion.id,
        categoryId: formattedQuestion.categoryId,
        categoryUuid: formattedQuestion.categoryUuid,
        'category?.id': formattedQuestion.category?.id
      });

      return res.status(200).json(formattedQuestion);
    } catch (error) {
      console.error('Erro ao atualizar pergunta:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a pergunta' });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log(`Excluindo pergunta com ID: ${id}`);
      
      // Primeiro, excluir as opções relacionadas à pergunta
      await prisma.option.deleteMany({
        where: {
          questionId: id
        }
      });
      
      // Em seguida, desconectar a pergunta de suas categorias
      await prisma.$executeRaw`
        DELETE FROM "_CategoryToQuestion"
        WHERE "B" = ${id}
      `;
      
      // Por fim, excluir a pergunta
      await prisma.question.delete({
        where: {
          id: id
        }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Pergunta excluída com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
      return res.status(500).json({ 
        error: 'Erro ao excluir a pergunta',
        message: 'Ocorreu um erro ao tentar excluir a pergunta. Por favor, tente novamente.'
      });
    }
  } else if (req.method === 'GET') {
    try {
      console.log(`Buscando detalhes da pergunta com ID: ${id}`);
      
      // Vamos usar SQL bruto para evitar problemas de tipagem
      const questionQuery = `
        SELECT 
          q.id, 
          q.text, 
          q."stageId",
          q."categoryId",
          s.id as "stage_id",
          s.title as "stage_title",
          s.description as "stage_description",
          s.order as "stage_order",
          c.id as "category_id",
          c.name as "category_name",
          c.description as "category_description"
        FROM "Question" q
        LEFT JOIN "Stage" s ON q."stageId" = s.id
        LEFT JOIN "Category" c ON q."categoryId" = c.id
        WHERE q.id = '${id}'
      `;
      
      const optionsQuery = `
        SELECT id, text, "isCorrect", "createdAt", "updatedAt"
        FROM "Option"
        WHERE "questionId" = '${id}'
      `;
      
      const questionResult = await prisma.$queryRawUnsafe(questionQuery);
      const optionsResult = await prisma.$queryRawUnsafe(optionsQuery);
      
      if (!questionResult || !Array.isArray(questionResult) || questionResult.length === 0) {
        return res.status(404).json({ error: 'Pergunta não encontrada' });
      }

      // Definir interface para o tipo do resultado da query
      interface QuestionQueryResult {
        id: string;
        text: string;
        stageId: string;
        categoryId: string | null;
        stage_id: string;
        stage_title: string;
        stage_description: string | null;
        stage_order: number | null;
        category_id: string | null;
        category_name: string | null;
        category_description: string | null;
      }

      // Usar asserção de tipo
      const question = questionResult[0] as QuestionQueryResult;
      const optionsList = Array.isArray(optionsResult) ? optionsResult : [];

      // Formatar a resposta
      const formattedQuestion = {
        id: question.id,
        text: question.text,
        stageId: question.stageId,
        categoryId: question.category_id || null,
        categoryUuid: question.category_id || null, 
        options: optionsList.map(option => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          createdAt: new Date(option.createdAt).toISOString(),
          updatedAt: new Date(option.updatedAt).toISOString()
        })),
        stage: {
          id: question.stage_id,
          title: question.stage_title,
          description: question.stage_description === null ? '' : question.stage_description,
          order: question.stage_order || 0
        },
        category: question.category_id ? {
          id: question.category_id,
          name: question.category_name === null ? '' : question.category_name,
          description: question.category_description === null ? '' : question.category_description
        } : null
      };

      console.assert(typeof question.id === 'string', 'question.id deve ser uma string');
      console.assert(typeof question.text === 'string', 'question.text deve ser uma string');
      console.assert(typeof question.stageId === 'string', 'question.stageId deve ser uma string');
      console.assert(typeof question.category_id === 'string' || question.category_id === null, 'question.category_id deve ser uma string ou null');
      console.assert(typeof question.stage_id === 'string', 'question.stage_id deve ser uma string');
      console.assert(typeof question.stage_title === 'string', 'question.stage_title deve ser uma string');
      console.assert(typeof question.stage_description === 'string', 'question.stage_description deve ser uma string');
      console.assert(typeof question.stage_order === 'number', 'question.stage_order deve ser um número');
      console.assert(typeof question.category_id === 'string' || question.category_id === null, 'question.category_id deve ser uma string ou null');
      console.assert(typeof question.category_name === 'string', 'question.category_name deve ser uma string');
      console.assert(typeof question.category_description === 'string', 'question.category_description deve ser uma string');

      console.log('API retornando pergunta formatada:', {
        id: formattedQuestion.id,
        categoryId: formattedQuestion.categoryId,
        categoryUuid: formattedQuestion.categoryUuid,
        'category?.id': formattedQuestion.category?.id
      });

      return res.status(200).json(formattedQuestion);
    } catch (error) {
      console.error('Erro ao buscar pergunta:', error);
      return res.status(500).json({ error: 'Erro ao buscar a pergunta' });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
