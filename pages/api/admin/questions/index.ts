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
      let questions = [];
      
      try {
        // Buscar todas as perguntas com suas opções usando SQL raw
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
          JOIN "Stage" s ON q."stageId" = s.id
          ORDER BY s.order ASC, q."createdAt" DESC
        `;
      } catch (error) {
        console.error('Erro ao buscar perguntas (tabela pode não existir):', error);
        // Se a tabela não existir, retornar array vazio
        return res.status(200).json([]);
      }

      // Para cada pergunta, buscar suas opções
      const questionsWithOptions = Array.isArray(questions) 
        ? await Promise.all(questions.map(async (question: any) => {
            let options = [];
            
            try {
              options = await prisma.$queryRaw`
                SELECT id, text, "isCorrect"
                FROM "Option"
                WHERE "questionId" = ${question.id}
                ORDER BY id
              `;
            } catch (optionError) {
              console.error('Erro ao buscar opções (tabela pode não existir):', optionError);
              // Se a tabela não existir, usar array vazio
            }
            
            return {
              ...question,
              options: Array.isArray(options) ? options : [],
              categories: [], 
              stage: {
                title: question.stageTitle,
                order: question.stageOrder
              }
            };
          }))
        : [];

      return res.status(200).json(questionsWithOptions);
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { text, stageId, options } = req.body;

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

      // Verificar se pelo menos uma opção está marcada como correta
      const hasCorrectOption = options.some((option: any) => option.isCorrect);
      if (!hasCorrectOption) {
        return res.status(400).json({ error: 'Pelo menos uma opção deve ser marcada como correta' });
      }

      let questionId = null;
      
      try {
        // Criar a pergunta
        await prisma.$executeRaw`
          INSERT INTO "Question" (id, text, "stageId", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${text}, ${stageId}, NOW(), NOW())
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

      // Buscar a pergunta completa com suas opções
      try {
        const createdQuestions = await prisma.$queryRaw`
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
          JOIN "Stage" s ON q."stageId" = s.id
          WHERE q.id = ${questionId}
        `;

        if (!Array.isArray(createdQuestions) || createdQuestions.length === 0) {
          return res.status(500).json({ error: 'Erro ao buscar pergunta criada' });
        }

        const createdQuestion = createdQuestions[0];
        
        const options = await prisma.$queryRaw`
          SELECT id, text, "isCorrect"
          FROM "Option"
          WHERE "questionId" = ${questionId}
          ORDER BY id
        `;

        const questionWithOptions = {
          ...createdQuestion,
          options: Array.isArray(options) ? options : [],
          categories: [], 
          stage: {
            title: createdQuestion.stageTitle,
            order: createdQuestion.stageOrder
          }
        };

        return res.status(201).json(questionWithOptions);
      } catch (error) {
        console.error('Erro ao buscar pergunta criada:', error);
        return res.status(201).json({ id: questionId, text, stageId, options });
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
