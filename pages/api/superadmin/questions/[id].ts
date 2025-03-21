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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID da pergunta é obrigatório' });
  }

  try {
    // GET - Obter detalhes de uma pergunta específica
    if (req.method === 'GET') {
      const globalQuestion = await prisma.globalQuestion.findUnique({
        where: { id },
        include: {
          tests: true,
          questions: {
            include: {
              categories: true,
              options: true,
            },
          },
        },
      });

      if (!globalQuestion) {
        return res.status(404).json({ message: 'Pergunta não encontrada' });
      }

      // Formatar os dados para o frontend
      const categories = globalQuestion.questions.flatMap(q => q.categories);
      const uniqueCategories = Array.from(new Map(categories.map(cat => [cat.id, cat])).values());
      
      // Pegar as opções da primeira pergunta vinculada (todas devem ser iguais)
      const options = globalQuestion.questions.length > 0 ? globalQuestion.questions[0].options : [];
      
      const response = {
        id: globalQuestion.id,
        text: globalQuestion.text,
        type: globalQuestion.type,
        difficulty: globalQuestion.difficulty,
        categories: uniqueCategories,
        options: options,
        testsCount: globalQuestion.tests.length,
        createdAt: globalQuestion.createdAt,
        updatedAt: globalQuestion.updatedAt,
      };

      return res.status(200).json(response);
    }

    // PUT - Atualizar uma pergunta global
    if (req.method === 'PUT') {
      const { text, type, difficulty, categoryIds, options, stageId } = req.body;

      if (!text || !type || !difficulty || !categoryIds || !options || !stageId) {
        return res.status(400).json({ message: 'Dados incompletos' });
      }

      // Verificar se a pergunta global existe
      const existingGlobalQuestion = await prisma.globalQuestion.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              categories: true,
              options: true,
            },
          },
        },
      });

      if (!existingGlobalQuestion) {
        return res.status(404).json({ message: 'Pergunta não encontrada' });
      }

      // Atualizar a pergunta global
      const updatedGlobalQuestion = await prisma.globalQuestion.update({
        where: { id },
        data: {
          text,
          type: type as QuestionType,
          difficulty: difficulty as DifficultyLevel,
        },
      });

      // Excluir as perguntas regulares vinculadas existentes
      await prisma.question.deleteMany({
        where: {
          globalQuestionId: id,
        },
      });

      // Criar novas perguntas regulares vinculadas para cada categoria
      const questionPromises = categoryIds.map(async (categoryId: string) => {
        const question = await prisma.question.create({
          data: {
            text,
            type: type as QuestionType,
            difficulty: difficulty as DifficultyLevel,
            globalQuestionId: id,
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
        id: updatedGlobalQuestion.id,
        text: updatedGlobalQuestion.text,
        type: updatedGlobalQuestion.type,
        difficulty: updatedGlobalQuestion.difficulty,
        categories: questions[0].categories,
        options: questions[0].options,
        createdAt: updatedGlobalQuestion.createdAt,
        updatedAt: updatedGlobalQuestion.updatedAt,
      };

      return res.status(200).json(response);
    }

    // DELETE - Excluir uma pergunta global
    if (req.method === 'DELETE') {
      // Verificar se a pergunta está sendo usada em testes globais
      const testsCount = await prisma.globalTest.count({
        where: {
          questions: {
            some: {
              id,
            },
          },
        },
      });

      if (testsCount > 0) {
        return res.status(400).json({ 
          message: `Esta pergunta está sendo usada em ${testsCount} testes globais. Remova-a dos testes primeiro.` 
        });
      }

      // Excluir as perguntas regulares vinculadas
      await prisma.question.deleteMany({
        where: {
          globalQuestionId: id,
        },
      });

      // Excluir a pergunta global
      await prisma.globalQuestion.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Pergunta excluída com sucesso' });
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de perguntas:', error);
    
    // Verificar se é um erro de registro não encontrado
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Pergunta não encontrada' });
    }
    
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
