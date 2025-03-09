import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do estágio inválido' })
  }

  // Verificar se o estágio existe
  try {
    const stage = await prisma.stage.findUnique({
      where: { id }
    });

    if (!stage) {
      return res.status(404).json({ error: 'Estágio não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar estágio:', error);
    return res.status(500).json({ error: 'Erro ao verificar estágio' });
  }

  // Adicionar questões ao estágio (POST)
  if (req.method === 'POST') {
    try {
      const { questionIds } = req.body;

      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ error: 'Lista de IDs de questões é obrigatória' });
      }

      // Verificar se todas as questões existem
      const questions = await prisma.question.findMany({
        where: {
          id: {
            in: questionIds
          }
        }
      });

      if (questions.length !== questionIds.length) {
        return res.status(404).json({ error: 'Uma ou mais questões não foram encontradas' });
      }

      // Verificar quais questões já estão associadas a este estágio
      const existingQuestions = await prisma.question.findMany({
        where: {
          id: {
            in: questionIds
          },
          stageId: id
        }
      });

      const existingQuestionIds = existingQuestions.map(q => q.id);
      
      // Filtrar apenas as questões que ainda não estão associadas
      const newQuestionIds = questionIds.filter(qId => !existingQuestionIds.includes(qId));

      if (newQuestionIds.length === 0) {
        return res.status(400).json({ error: 'Todas as questões selecionadas já estão associadas a este estágio' });
      }

      // Atualizar as questões para associá-las ao estágio usando SQL raw para garantir compatibilidade
      for (const questionId of newQuestionIds) {
        await prisma.$executeRaw`
          UPDATE "Question" 
          SET "stageId" = ${id} 
          WHERE id = ${questionId}
        `;
      }

      return res.status(201).json({ 
        success: true,
        addedCount: newQuestionIds.length,
        alreadyExistingCount: existingQuestionIds.length
      });
    } catch (error) {
      console.error('Erro ao adicionar questões ao estágio:', error);
      return res.status(500).json({ error: 'Erro ao adicionar questões ao estágio' });
    }
  } 
  // Obter todas as questões de um estágio (GET)
  else if (req.method === 'GET') {
    try {
      const questions = await prisma.$queryRaw`
        SELECT 
          q.id,
          q.text,
          q."stageId",
          q."categoryId",
          q."createdAt",
          q."updatedAt"
        FROM "Question" q
        WHERE q."stageId" = ${id}
      `;

      // Para cada questão, buscar as opções
      const questionsWithOptions = await Promise.all((Array.isArray(questions) ? questions : []).map(async (question) => {
        const options = await prisma.$queryRaw`
          SELECT 
            id,
            text,
            "isCorrect",
            "questionId",
            "createdAt",
            "updatedAt"
          FROM "Option"
          WHERE "questionId" = ${question.id}
        `;

        return {
          ...question,
          options: Array.isArray(options) ? options : []
        };
      }));

      return res.status(200).json(questionsWithOptions);
    } catch (error) {
      console.error('Erro ao buscar questões do estágio:', error);
      return res.status(500).json({ error: 'Erro ao buscar questões do estágio' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
