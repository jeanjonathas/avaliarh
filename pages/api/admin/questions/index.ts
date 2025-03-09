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
      const { stageId, testId } = req.query;
      
      console.log('Parâmetros de busca:', { stageId, testId });
      
      try {
        // Consulta simplificada sem o JOIN com Category
        if (stageId && stageId !== 'all') {
          console.log('Buscando perguntas por etapa:', stageId);
          questions = await prisma.$queryRaw`
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              s.title as "stageTitle", 
              s.order as "stageOrder",
              q."createdAt", 
              q."updatedAt",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
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
              s.title as "stageTitle", 
              s.order as "stageOrder",
              q."createdAt", 
              q."updatedAt",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
            LEFT JOIN "TestStage" ts ON s.id = ts."stageId"
            WHERE ts."testId" = ${testId}
            ORDER BY COALESCE(s.order, 0) ASC, q."createdAt" DESC
          `;
        } else {
          console.log('Buscando todas as perguntas');
          questions = await prisma.$queryRaw`
            SELECT 
              q.id, 
              q.text, 
              q."stageId",
              s.title as "stageTitle", 
              s.order as "stageOrder",
              q."createdAt", 
              q."updatedAt",
              'MEDIUM' as difficulty
            FROM "Question" q
            LEFT JOIN "Stage" s ON q."stageId" = s.id
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
                SELECT c.name FROM "Category" c
                JOIN "Question" q ON q."categoryId" = c.id
                WHERE q.id = ${question.id}
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
      const { text, stageId, categoryId, options } = req.body;

      if (!text || !stageId || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      // Verificar se a etapa existe
      try {
        const stages = await prisma.$queryRaw`
          SELECT id FROM "Stage" WHERE id = ${stageId}
        `;

        if (!Array.isArray(stages) || stages.length === 0) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }
      } catch (error) {
        console.error('Erro ao verificar etapa (tabela pode não existir):', error);
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      // Verificar se a categoria existe (se fornecida)
      if (categoryId) {
        try {
          const categories = await prisma.$queryRaw`
            SELECT id FROM "Category" WHERE id = ${categoryId}
          `;

          if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
          }
        } catch (error) {
          console.error('Erro ao verificar categoria (tabela pode não existir):', error);
          // Continuar mesmo se a categoria não for encontrada
        }
      }

      // Verificar se pelo menos uma opção está marcada como correta
      const hasCorrectOption = options.some((option: any) => option.isCorrect);
      if (!hasCorrectOption) {
        return res.status(400).json({ error: 'Pelo menos uma opção deve ser marcada como correta' });
      }

      let questionId = null;
      
      try {
        // Criar a pergunta
        await prisma.$executeRaw`
          INSERT INTO "Question" (id, text, "stageId", "categoryId", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${text}, ${stageId}, ${categoryId === undefined ? null : categoryId}, NOW(), NOW())
        `;

        // Buscar o ID da pergunta recém-criada
        const questionIds = await prisma.$queryRaw`
          SELECT id FROM "Question" 
          WHERE text = ${text} AND "stageId" = ${stageId}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `;

        if (!Array.isArray(questionIds) || questionIds.length === 0) {
          return res.status(500).json({ error: 'Erro ao criar pergunta' });
        }
        
        questionId = questionIds[0].id;
      } catch (error) {
        console.error('Erro ao criar pergunta (tabela pode não existir):', error);
        return res.status(500).json({ error: 'Erro ao criar pergunta' });
      }

      // Criar as opções
      try {
        for (const option of options) {
          await prisma.$executeRaw`
            INSERT INTO "Option" (id, text, "isCorrect", "questionId", "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid(), 
              ${option.text}, 
              ${option.isCorrect}, 
              ${questionId}, 
              NOW(), 
              NOW()
            )
          `;
        }
      } catch (error) {
        console.error('Erro ao criar opções (tabela pode não existir):', error);
        // Tentar excluir a pergunta se a criação das opções falhar
        try {
          await prisma.$executeRaw`DELETE FROM "Question" WHERE id = ${questionId}`;
        } catch (deleteError) {
          console.error('Erro ao excluir pergunta após falha:', deleteError);
        }
        
        return res.status(500).json({ error: 'Erro ao criar opções' });
      }

      // Buscar a pergunta criada com detalhes
      const createdQuestionResult = await prisma.$queryRaw`
        SELECT 
          q.id, 
          q.text, 
          q."stageId",
          s.title as "stageTitle", 
          s.order as "stageOrder",
          q."createdAt", 
          q."updatedAt",
          'MEDIUM' as difficulty
        FROM "Question" q
        LEFT JOIN "Stage" s ON q."stageId" = s.id
        WHERE q.id = ${questionId}
      `;

      // Verificar se a pergunta foi encontrada
      if (!Array.isArray(createdQuestionResult) || createdQuestionResult.length === 0) {
        return res.status(500).json({ error: 'Erro ao buscar pergunta criada' });
      }

      const createdQuestion = createdQuestionResult[0];

      // Buscar opções para a pergunta
      const createdOptions = await prisma.$queryRaw`
        SELECT id, text, "isCorrect" FROM "Option" WHERE "questionId" = ${questionId}
      `;

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
            SELECT c.name FROM "Category" c
            JOIN "Question" q ON q."categoryId" = c.id
            WHERE q.id = ${questionId}
          `;
          if (Array.isArray(category) && category.length > 0) {
            categoryName = category[0].name;
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar categoria para a pergunta ${questionId}:`, error);
        // Se houver erro, continuar com o valor padrão
      }

      const questionWithOptions = {
        ...createdQuestion,
        options: Array.isArray(createdOptions) ? createdOptions : [],
        categoryName: categoryName,
        stage: {
          title: createdQuestion.stageTitle,
          order: createdQuestion.stageOrder
        },
        createdAt: createdQuestion.createdAt,
        updatedAt: createdQuestion.updatedAt
      };

      return res.status(201).json(questionWithOptions);
    } catch (error) {
      console.error('Erro ao criar pergunta:', error);
      return res.status(500).json({ error: 'Erro ao criar pergunta' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
