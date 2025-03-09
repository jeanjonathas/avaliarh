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
      const existingAssociations = await prisma.stageQuestion.findMany({
        where: {
          stageId: id,
          questionId: {
            in: questionIds
          }
        }
      });

      const existingQuestionIds = existingAssociations.map(assoc => assoc.questionId);
      
      // Filtrar apenas as questões que ainda não estão associadas
      const newQuestionIds = questionIds.filter(qId => !existingQuestionIds.includes(qId));

      if (newQuestionIds.length === 0) {
        return res.status(400).json({ error: 'Todas as questões selecionadas já estão associadas a este estágio' });
      }

      // Encontrar a maior ordem atual para adicionar as novas questões em sequência
      const maxOrderResult = await prisma.stageQuestion.findFirst({
        where: {
          stageId: id
        },
        orderBy: {
          order: 'desc'
        }
      });
      
      let nextOrder = maxOrderResult ? maxOrderResult.order + 1 : 0;

      // Criar associações entre as questões e o estágio na tabela StageQuestion
      const createdAssociations = [];
      for (const questionId of newQuestionIds) {
        const association = await prisma.stageQuestion.create({
          data: {
            stageId: id,
            questionId: questionId,
            order: nextOrder++,
            updatedAt: new Date()
          }
        });
        createdAssociations.push(association);
      }

      return res.status(201).json({ 
        success: true,
        addedCount: newQuestionIds.length,
        alreadyExistingCount: existingQuestionIds.length,
        associations: createdAssociations
      });
    } catch (error) {
      console.error('Erro ao adicionar questões ao estágio:', error);
      return res.status(500).json({ error: 'Erro ao adicionar questões ao estágio' });
    }
  } 
  // Obter todas as questões de um estágio (GET)
  else if (req.method === 'GET') {
    try {
      // Buscar as associações entre o estágio e as questões, ordenadas pela ordem definida
      const stageQuestions = await prisma.stageQuestion.findMany({
        where: {
          stageId: id
        },
        orderBy: {
          order: 'asc'
        },
        include: {
          question: {
            include: {
              options: true,
              Category: true
            }
          }
        }
      });

      // Transformar os resultados para manter a compatibilidade com o frontend
      const questions = stageQuestions.map(sq => ({
        ...sq.question,
        order: sq.order // Adicionar a ordem da questão no resultado
      }));

      return res.status(200).json(questions);
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
