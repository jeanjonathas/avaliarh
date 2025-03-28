import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar método da requisição
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    // Verificar permissões (apenas superadmin pode importar perguntas)
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }

    // Reconectar Prisma para garantir conexão fresca
    await reconnectPrisma();

    // Obter dados da requisição
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma pergunta válida para importar' });
    }

    // Array para armazenar as perguntas criadas
    const createdQuestions = [];

    // Buscar uma etapa para associar as perguntas
    // Como não existe campo isGlobal, vamos buscar a primeira etapa disponível
    // ou criar uma etapa global se necessário
    let stageForQuestions = await prisma.stage.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!stageForQuestions) {
      // Se não encontrar nenhuma etapa, criar uma etapa global
      const globalTest = await prisma.test.findFirst({
        where: { testType: "selection" },
        orderBy: { createdAt: 'desc' }
      });

      if (!globalTest) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum teste encontrado para associar as perguntas' 
        });
      }

      // Criar uma nova etapa para o teste
      stageForQuestions = await prisma.stage.create({
        data: {
          title: "Banco de Perguntas Global",
          description: "Etapa para perguntas importadas",
          order: 1,
          testId: globalTest.id,
          questionType: "selection"
        }
      });
    }

    // Processar cada pergunta
    for (const questionData of questions) {
      try {
        // Criar a pergunta
        let newQuestion = await prisma.question.create({
          data: {
            text: questionData.text,
            type: questionData.type,
            difficulty: questionData.difficulty,
            stageId: stageForQuestions.id, // Associar à etapa global
            questionType: "selection",
            // Relacionar com categorias
            categories: {
              connect: questionData.categoryIds.map((id: string) => ({ id }))
            }
          },
          include: {
            categories: true,
            options: true,
            emotionGroup: true
          }
        });

        // Para perguntas opinativas, relacionar com grupo emocional
        if (questionData.type === 'OPINION_MULTIPLE' && questionData.emotionGroupId) {
          newQuestion = await prisma.question.update({
            where: { id: newQuestion.id },
            data: {
              emotionGroup: {
                connect: { id: questionData.emotionGroupId }
              }
            },
            include: {
              categories: true,
              options: true,
              emotionGroup: true
            }
          });
        }

        // Criar opções para a pergunta
        for (const option of questionData.options) {
          await prisma.option.create({
            data: {
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: newQuestion.id,
              // Para questões opinativas, adicionar categoria
              ...(questionData.type === 'OPINION_MULTIPLE' && option.categoryNameUuid
                ? {
                    categoryName: option.categoryName,
                    categoryNameUuid: option.categoryNameUuid
                  }
                : {})
            }
          });
        }

        // Buscar a pergunta completa com todas as relações
        const completeQuestion = await prisma.question.findUnique({
          where: { id: newQuestion.id },
          include: {
            categories: true,
            options: true,
            emotionGroup: true
          }
        });

        if (completeQuestion) {
          createdQuestions.push(completeQuestion);
        }
      } catch (error) {
        console.error('Erro ao criar pergunta:', error);
        // Continuar com a próxima pergunta mesmo se houver erro
      }
    }

    // Retornar as perguntas criadas
    return res.status(200).json({
      success: true,
      message: `${createdQuestions.length} perguntas importadas com sucesso`,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Erro ao importar perguntas:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
