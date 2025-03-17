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
        // Consulta simplificada sem o JOIN com Category
        if (categoryId && categoryId !== 'all') {
          console.log('Buscando perguntas por categoria:', categoryId);
          questions = await prisma.$queryRaw`
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              q."categoryId",
              q."createdAt", 
              q."updatedAt",
              s.title as "stageTitle", 
              s.description as "stageDescription",
              s.order as "stageOrder",
              c.name as "categoryName",
              c.description as "categoryDescription",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "Category" c ON q."categoryId" = c.id
            WHERE q."categoryId" = ${categoryId}
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
        } else if (stageId && stageId !== 'all' && testId && testId !== 'all') {
          console.log('Buscando perguntas por teste e etapa:', { testId, stageId });
          questions = await prisma.$queryRaw`
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              q."categoryId",
              q."createdAt", 
              q."updatedAt",
              s.title as "stageTitle", 
              s.order as "stageOrder",
              c.name as "categoryName",
              c.description as "categoryDescription",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "TestStage" ts ON s.id = ts."stageId"
            LEFT JOIN "Category" c ON q."categoryId" = c.id
            WHERE q."stageId" = ${stageId} AND ts."testId" = ${testId}
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
        } else if (stageId && stageId !== 'all') {
          console.log('Buscando perguntas por etapa:', stageId);
          questions = await prisma.$queryRaw`
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              q."categoryId",
              s.title as "stageTitle", 
              s.order as "stageOrder",
              q."createdAt", 
              q."updatedAt",
              c.name as "categoryName",
              c.description as "categoryDescription",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "Category" c ON q."categoryId" = c.id
            WHERE q."stageId" = ${stageId}
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
        } else if (testId && testId !== 'all') {
          console.log('Buscando perguntas por teste:', testId);
          questions = await prisma.$queryRaw`
            SELECT 
              q.id,
              q.text,
              q."stageId",
              q."categoryId",
              q."createdAt",
              q."updatedAt",
              s.title as "stageTitle",
              s.description as "stageDescription",
              s.order as "stageOrder",
              c.name as "categoryName",
              c.description as "categoryDescription",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "TestStage" ts ON s.id = ts."stageId"
            LEFT JOIN "Category" c ON q."categoryId" = c.id
            WHERE ts."testId" = ${testId}
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
        } else if (ids) {
          // Buscar perguntas por IDs específicos
          console.log('Buscando perguntas por IDs específicos:', ids);
          
          // Converter string de IDs separados por vírgula em um array
          const questionIds = typeof ids === 'string' ? ids.split(',') : Array.isArray(ids) ? ids : [];
          
          if (questionIds.length === 0) {
            return res.status(400).json({ error: 'IDs de perguntas inválidos' });
          }
          
          // Construir a consulta SQL com os IDs
          const placeholders = questionIds.map((_, i) => `$${i + 1}`).join(', ');
          
          // Executar a consulta usando $queryRawUnsafe para passar os IDs como parâmetros
          const query = `
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              q."categoryId",
              q."createdAt", 
              q."updatedAt",
              s.title as "stageTitle", 
              s.description as "stageDescription",
              s.order as "stageOrder",
              c.name as "categoryName",
              c.description as "categoryDescription",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "Category" c ON q."categoryId" = c.id
            WHERE q.id IN (${placeholders})
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
          
          questions = await prisma.$queryRawUnsafe(query, ...questionIds);
        } else {
          console.log('Buscando todas as perguntas');
          // Obter todas as perguntas
          questions = await prisma.$queryRaw`
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              q."categoryId",
              q."createdAt", 
              q."updatedAt",
              s.title as "stageTitle", 
              s.description as "stageDescription",
              s.order as "stageOrder",
              c.name as "categoryName",
              c.description as "categoryDescription",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "Category" c ON q."categoryId" = c.id
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
        }
        console.log(`Encontradas ${Array.isArray(questions) ? questions.length : 0} perguntas`);
      } catch (error) {
        console.error('Erro ao buscar perguntas (tabela pode não existir):', error);
        // Se a tabela não existir, retornar array vazio
        return res.status(200).json([]);
      }

      // Formatar os resultados
      console.log('Formatando resultados das perguntas');
      const formattedQuestions = await Promise.all(
        questions.map(async (question: any) => {
          // Buscar opções para a pergunta
          let options = [];
          try {
            options = await prisma.$queryRaw`
              SELECT id, text, "isCorrect" FROM "Option" WHERE "questionId" = ${question.id}
            `;
            console.log(`Encontradas ${Array.isArray(options) ? options.length : 0} opções para a pergunta ${question.id}`);
          } catch (error) {
            console.error(`Erro ao buscar opções para a pergunta ${question.id}:`, error);
            // Se houver erro, continuar com array vazio
          }

          // Buscar categoria da pergunta (se existir)
          let categoryName = 'Sem categoria';
          try {
            // Verificar se a coluna categoryId existe na tabela Question
            const checkColumn = await prisma.$queryRaw`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'Question' AND column_name = 'categoryId'
            `;
            
            if (Array.isArray(checkColumn) && checkColumn.length > 0) {
              const category = await prisma.$queryRaw`
                SELECT 
                  c.id,
                  c.name,
                  c.description,
                  COUNT(q.id) as "questionCount"
                FROM "Category" c
                LEFT JOIN "Question" q ON q."categoryId" = c.id
                WHERE c.id = ${question.categoryId}
                GROUP BY c.id, c.name, c.description
              `;
              if (Array.isArray(category) && category.length > 0) {
                categoryName = category[0].name;
              }
            }
          } catch (error) {
            console.error(`Erro ao buscar categoria para a pergunta ${question.id}:`, error);
            // Se houver erro, continuar com o valor padrão
          }

          return {
            ...question,
            options: Array.isArray(options) ? options : [],
            categoryName: categoryName,
            stage: {
              title: question.stageTitle || 'Sem etapa',
              order: question.stageOrder || 0
            },
            createdAt: question.createdAt,
            updatedAt: question.updatedAt
          };
        })
      );

      console.log(`Retornando ${formattedQuestions.length} perguntas formatadas`);
      return res.status(200).json(formattedQuestions);
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { text, stageId, categoryUuid, options, type, difficulty, showResults } = req.body;
      
      console.log('Recebendo requisição POST para criar pergunta:', {
        text,
        stageId,
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
      if (categoryUuid) {
        try {
          console.log('Verificando se a categoria existe:', categoryUuid);
          
          // Verificar se o categoryUuid é um UUID válido
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryUuid);
          
          if (!isValidUuid) {
            console.error('UUID de categoria inválido:', categoryUuid);
            return res.status(400).json({ error: 'UUID de categoria inválido' });
          }
          
          const category = await prisma.$queryRaw`
            SELECT id FROM "Category" WHERE id = ${categoryUuid}
          `;

          console.log('Resultado da consulta de categoria:', category);

          if (!Array.isArray(category) || category.length === 0) {
            console.log('Erro: categoria não encontrada');
            return res.status(404).json({ error: 'Categoria não encontrada' });
          }
          
          finalCategoryId = categoryUuid;
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
            categoryId: finalCategoryId,
            type: (type || 'MULTIPLE_CHOICE') as any,
            difficulty: (difficulty || 'MEDIUM') as any,
            showResults: showResults !== undefined ? showResults : true,
          }
        });

        console.log('Pergunta criada com sucesso:', newQuestion.id);
        
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
            stage: true,
            options: true,
            company: true,
            categories: true,
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
          categoryId: questionWithRelations.categoryId,
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
          category: questionWithRelations.categoryId && questionWithRelations.categories.length > 0 ? {
            id: questionWithRelations.categoryId,
            name: questionWithRelations.categories[0]?.name || '',
            description: questionWithRelations.categories[0]?.description || '',
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
