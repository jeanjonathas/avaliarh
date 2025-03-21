import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient, QuestionType, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verificar autenticação e permissão de superadmin
  if (!session || (session.user?.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
    // GET - Listar todas as perguntas globais
    if (req.method === 'GET') {
      const questions = await prisma.globalQuestion.findMany({
        include: {
          tests: true,
          questions: {
            include: {
              categories: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Formatar os dados para o frontend
      const formattedQuestions = questions.map(question => {
        const categories = question.questions.flatMap(q => q.categories);
        const uniqueCategories = Array.from(new Map(categories.map(cat => [cat.id, cat])).values());
        
        return {
          id: question.id,
          text: question.text,
          type: question.type,
          difficulty: question.difficulty,
          categories: uniqueCategories,
          options: [], // Precisamos buscar as opções separadamente
          testsCount: question.tests.length,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
        };
      });

      return res.status(200).json(formattedQuestions);
    }

    // POST - Criar uma nova pergunta global
    if (req.method === 'POST') {
      const { text, type, difficulty, categoryIds, options, isGlobal, stageId } = req.body;

      if (!text || !type || !difficulty || !categoryIds || !options || !stageId) {
        return res.status(400).json({ message: 'Dados incompletos' });
      }

      // Criar a pergunta global
      const globalQuestion = await prisma.globalQuestion.create({
        data: {
          text,
          type: type as QuestionType,
          difficulty: difficulty as DifficultyLevel,
          categories: {
            connect: categoryIds.map((id: string) => ({ id })),
          },
        },
      });

      // Criar uma pergunta regular vinculada à global para cada categoria
      const questionPromises = categoryIds.map(async (categoryId: string) => {
        const question = await prisma.question.create({
          data: {
            text,
            type: type as QuestionType,
            difficulty: difficulty as DifficultyLevel,
            globalQuestionId: globalQuestion.id,
            stageId,
            categories: {
              connect: { id: categoryId },
            },
            options: {
              createMany: {
                data: options.map((option: any) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                })),
              },
            },
          },
          include: {
            categories: true,
            options: true,
          },
        });
        return question;
      });

      const questions = await Promise.all(questionPromises);
      
      // Formatar a resposta
      const response = {
        id: globalQuestion.id,
        text: globalQuestion.text,
        type: globalQuestion.type,
        difficulty: globalQuestion.difficulty,
        categories: questions[0].categories,
        options: questions[0].options,
        createdAt: globalQuestion.createdAt,
        updatedAt: globalQuestion.updatedAt,
      };

      return res.status(201).json(response);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de perguntas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
