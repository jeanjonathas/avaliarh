/// <reference types="next" />
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../lib/prisma';
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
    const { text, stageId, categoryId, options, type, difficulty, initialExplanation } = req.body
    
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
      // Verificar se a etapa existe
      const stage = await prisma.stage.findUnique({
        where: { id: stageId }
      });
      
      if (!stage) {
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }
      
      // Verificar se a categoria existe (se fornecida)
      if (categoryId) {
        try {
          console.log('Verificando se a categoria existe:', categoryId);
          
          // Verificar se o categoryId é um UUID válido
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
          
          if (!isValidUuid) {
            console.error('UUID de categoria inválido:', categoryId);
            return res.status(400).json({ error: 'UUID de categoria inválido' });
          }
          
          // Usar Prisma Client em vez de SQL raw para verificar a categoria
          const category = await prisma.category.findUnique({
            where: { id: categoryId }
          });

          if (!category) {
            console.log('Erro: categoria não encontrada');
            return res.status(404).json({ error: 'Categoria não encontrada' });
          }
          
          console.log('Categoria válida encontrada:', categoryId);
        } catch (error) {
          console.error('Erro ao verificar categoria:', error);
          return res.status(500).json({ error: 'Erro ao verificar categoria' });
        }
      }
      
      // 1. Atualizar a pergunta com todos os campos
      const updatedQuestion = await prisma.question.update({
        where: { id },
        data: {
          text,
          stage: {
            connect: { id: stageId }
          },
          // Atualizar apenas a relação categories, não usar categoryId diretamente
          ...(categoryId ? {
            categories: {
              set: [], // Limpar categorias existentes
              connect: [{ id: categoryId }] // Conectar nova categoria
            }
          } : {
            categories: { set: [] } // Remover todas as categorias se não houver categoryId
          }),
          type: type as any,
          difficulty: difficulty as any,
          initialExplanation: initialExplanation || undefined,
          updatedAt: new Date()
        },
        include: {
          options: true,
          stage: true,
          categories: true
        }
      });
      
      // 2. Excluir opções existentes
      await prisma.option.deleteMany({
        where: { questionId: id }
      });
      
      // 3. Criar novas opções
      if (Array.isArray(options) && options.length > 0) {
        for (const option of options) {
          const { text, isCorrect } = option;
          
          console.log(`Inserindo opção: ${text}, isCorrect: ${isCorrect}, tipo de pergunta: ${type}`);
          
          // Dados base para qualquer tipo de opção
          const optionData: any = {
            text,
            isCorrect,
            questionId: id,
            updatedAt: new Date()
          };
          
          // Adicionar campos específicos para perguntas de opinião, se existirem no schema
          if (type === 'OPINION_MULTIPLE' || type === 'OPINION') {
            try {
              // Usar os campos corretos conforme o schema do Prisma
              if (option.category) optionData.categoryName = option.category;
              if (option.categoryNameUuid) optionData.categoryNameUuid = option.categoryNameUuid;
              if (option.weight) optionData.weight = option.weight;
              if (option.explanation) optionData.explanation = option.explanation;
              
              console.log('Adicionando campos específicos para pergunta de opinião:', {
                categoryName: option.category,
                categoryNameUuid: option.categoryNameUuid,
                weight: option.weight,
                explanation: option.explanation
              });
            } catch (error) {
              console.warn('Alguns campos específicos para perguntas de opinião não puderam ser adicionados:', error);
            }
          }
          
          await prisma.option.create({
            data: optionData
          });
        }
      }
      
      // Buscar a pergunta atualizada com suas relações
      const question = await prisma.question.findUnique({
        where: { id },
        include: {
          options: true,
          stage: true,
          categories: true
        }
      });
      
      if (!question) {
        return res.status(404).json({ error: 'Pergunta não encontrada' });
      }

      // Formatar a resposta
      const formattedQuestion = {
        id: question.id,
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        stageId: question.stageId,
        categoryId: question.categories && question.categories.length > 0 ? question.categories[0].id : null,
        categoryUuid: question.categories && question.categories.length > 0 ? question.categories[0].id : null, 
        options: question.options.map(option => {
          // Dados base para qualquer tipo de opção
          const formattedOption: any = {
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
            createdAt: option.createdAt.toISOString(),
            updatedAt: option.updatedAt.toISOString()
          };
          
          // Adicionar campos específicos para perguntas de opinião, se existirem
          if (question.type === 'OPINION_MULTIPLE' || question.type === 'OPINION') {
            if ('opinionCategory' in option) formattedOption.opinionCategory = option.opinionCategory;
            if ('opinionWeight' in option) formattedOption.opinionWeight = option.opinionWeight;
            if ('explanation' in option) formattedOption.explanation = option.explanation;
          }
          
          return formattedOption;
        }),
        stage: question.stage ? {
          id: question.stage.id,
          title: question.stage.title,
          description: question.stage.description || '',
          order: question.stage.order || 0
        } : null,
        category: question.categories && question.categories.length > 0 ? {
          id: question.categories[0].id,
          name: question.categories[0].name,
          description: question.categories[0].description || ''
        } : null
      };

      console.log('API retornando pergunta formatada:', {
        id: formattedQuestion.id,
        categoryId: formattedQuestion.categoryId,
        categoryUuid: formattedQuestion.categoryUuid,
        'category?.id': formattedQuestion.category?.id,
        'options': formattedQuestion.options ? `${formattedQuestion.options.length} opções` : 'sem opções',
        'options[0]': formattedQuestion.options && formattedQuestion.options.length > 0 ? formattedQuestion.options[0] : null
      });

      return res.status(200).json(formattedQuestion);
    } catch (error) {
      console.error('Erro ao atualizar pergunta:', error);
      return res.status(500).json({ error: 'Erro ao atualizar a pergunta' });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log(`Excluindo pergunta com ID: ${id}`);
      
      // 1. Excluir as opções relacionadas à pergunta
      await prisma.option.deleteMany({
        where: { questionId: id }
      });
      
      // 2. Desconectar a pergunta de suas categorias usando Prisma em vez de SQL raw
      await prisma.question.update({
        where: { id },
        data: {
          categories: {
            set: [] // Desconecta todas as categorias
          }
        }
      });
      
      // 3. Excluir a pergunta
      await prisma.question.delete({
        where: { id }
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
      
      // Usar Prisma Client em vez de SQL bruto para evitar problemas de tipo
      const question = await prisma.question.findUnique({
        where: {
          id: id
        },
        include: {
          options: {
            orderBy: {
              position: 'asc'
            }
          },
          stage: true,
          categories: true,
          emotionGroup: true
        }
      });
      
      if (!question) {
        return res.status(404).json({ error: 'Pergunta não encontrada' });
      }

      console.log('Pergunta encontrada:', question);
      console.log('Opções da pergunta:', question.options);
      console.log('Número de opções encontradas:', question.options.length);

      // Formatar a resposta
      const formattedQuestion = {
        id: question.id,
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        stageId: question.stageId,
        categoryId: question.categories && question.categories.length > 0 ? question.categories[0].id : null,
        categoryUuid: question.categories && question.categories.length > 0 ? question.categories[0].id : null,
        initialExplanation: question.initialExplanation || '',
        options: question.options.map(option => {
          // Dados base para qualquer tipo de opção
          const formattedOption: any = {
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
            position: option.position || 0,
            createdAt: option.createdAt.toISOString(),
            updatedAt: option.updatedAt.toISOString()
          };
          
          // Adicionar campos específicos para perguntas de opinião, se existirem
          if (question.type === 'OPINION_MULTIPLE' || question.type === 'OPINION') {
            formattedOption.category = option.categoryName || '';
            formattedOption.categoryNameUuid = option.categoryNameUuid || '';
            formattedOption.weight = option.weight || 1;
            if ('explanation' in option) formattedOption.explanation = option.explanation;
          }
          
          return formattedOption;
        }),
        stage: question.stage ? {
          id: question.stage.id,
          title: question.stage.title,
          description: question.stage.description || '',
          order: question.stage.order || 0
        } : null,
        category: question.categories && question.categories.length > 0 ? {
          id: question.categories[0].id,
          name: question.categories[0].name,
          description: question.categories[0].description || ''
        } : null,
        // Incluir informações do grupo de emoções se for uma pergunta opinativa
        opinionGroup: question.type === 'OPINION_MULTIPLE' && question.emotionGroup ? {
          id: question.emotionGroup.id,
          name: question.emotionGroup.name
        } : null
      };

      console.log('API retornando pergunta formatada:', {
        id: formattedQuestion.id,
        categoryId: formattedQuestion.categoryId,
        categoryUuid: formattedQuestion.categoryUuid,
        'category?.id': formattedQuestion.category?.id,
        'options': formattedQuestion.options ? `${formattedQuestion.options.length} opções` : 'sem opções',
        'options[0]': formattedQuestion.options && formattedQuestion.options.length > 0 ? formattedQuestion.options[0] : null
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
