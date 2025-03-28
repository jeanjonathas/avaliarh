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

    // Verificar se o usuário tem uma empresa associada
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
      select: { companyId: true, role: true }
    });

    if (!user?.companyId && user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Usuário sem empresa associada' });
    }

    // Reconectar Prisma para garantir conexão fresca
    await reconnectPrisma();

    // Obter dados da requisição
    const { questions, emotionGroups } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma pergunta válida para importar' });
    }

    // Array para armazenar as perguntas criadas
    const createdQuestions = [];

    // Buscar uma etapa para associar as perguntas
    let stageForQuestions = await prisma.stage.findFirst({
      where: {
        test: {
          companyId: user.companyId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!stageForQuestions) {
      // Se não encontrar nenhuma etapa, criar uma etapa global
      const companyTest = await prisma.test.findFirst({
        where: { 
          companyId: user.companyId,
          testType: "selection" 
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!companyTest) {
        // Se não encontrar nenhum teste, criar um novo
        const newTest = await prisma.test.create({
          data: {
            title: "Banco de Perguntas",
            description: "Teste para perguntas importadas",
            companyId: user.companyId as string,
            testType: "selection"
          }
        });

        // Criar uma nova etapa para o teste
        stageForQuestions = await prisma.stage.create({
          data: {
            title: "Banco de Perguntas",
            description: "Etapa para perguntas importadas",
            order: 1,
            testId: newTest.id,
            questionType: "selection"
          }
        });
      } else {
        // Criar uma nova etapa para o teste existente
        stageForQuestions = await prisma.stage.create({
          data: {
            title: "Banco de Perguntas",
            description: "Etapa para perguntas importadas",
            order: 1,
            testId: companyTest.id,
            questionType: "selection"
          }
        });
      }
    }

    // Processar grupos de emoção primeiro (se existirem)
    const emotionGroupsMap: Record<string, string> = {};
    
    if (Array.isArray(emotionGroups) && emotionGroups.length > 0) {
      for (const groupData of emotionGroups) {
        try {
          // Verificar se o grupo já existe pelo nome
          let existingGroup = await prisma.emotionGroup.findFirst({
            where: {
              name: groupData.name
            }
          });
          
          if (!existingGroup) {
            // Criar novo grupo de emoção
            existingGroup = await prisma.emotionGroup.create({
              data: {
                name: groupData.name,
                description: groupData.description || ''
              }
            });
            
            console.log(`Grupo de emoção criado: ${existingGroup.name} (${existingGroup.id})`);
          }
          
          // Mapear nome do grupo para ID
          emotionGroupsMap[groupData.name] = existingGroup.id;
        } catch (error) {
          console.error('Erro ao criar grupo de emoção:', error);
        }
      }
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
            stageId: stageForQuestions.id,
            companyId: user.companyId as string,
            questionType: "selection",
            // Relacionar com categorias
            categories: {
              connect: questionData.categoryIds.map((id: string) => ({ id })).filter((item: any) => item.id)
            }
          },
          include: {
            categories: true,
            options: true,
            emotionGroup: true
          }
        });

        // Para perguntas opinativas, relacionar com grupo emocional
        if (questionData.type === 'OPINION_MULTIPLE') {
          if (questionData.emotionGroupName && emotionGroupsMap[questionData.emotionGroupName]) {
            // Usar o ID do grupo de emoção que foi criado ou encontrado
            const emotionGroupId = emotionGroupsMap[questionData.emotionGroupName];
            
            // Conectar ao grupo emocional
            newQuestion = await prisma.question.update({
              where: { id: newQuestion.id },
              data: {
                emotionGroup: {
                  connect: { id: emotionGroupId }
                }
              },
              include: {
                categories: true,
                options: true,
                emotionGroup: true
              }
            });
            
            console.log(`Pergunta opinativa conectada ao grupo emocional: ${questionData.emotionGroupName} (${emotionGroupId})`);
          } else if (questionData.emotionGroupId) {
            // Caso ainda tenha o ID direto do grupo
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
        }

        // Criar opções para a pergunta
        for (const option of questionData.options) {
          await prisma.option.create({
            data: {
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: newQuestion.id,
              // Para questões opinativas, adicionar categoria e peso
              ...(questionData.type === 'OPINION_MULTIPLE' && option.categoryName
                ? {
                    categoryName: option.categoryName,
                    categoryNameUuid: option.categoryNameUuid,
                    weight: option.weight || 0
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
      createdQuestions
    });
  } catch (error) {
    console.error('Erro ao importar perguntas:', error);
    return res.status(500).json({ success: false, message: 'Erro ao importar perguntas' });
  }
}
