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
      where: { id },
      include: {
        test: true, // Incluir o teste associado à etapa
        TestStage: {
          include: {
            test: true
          }
        }
      }
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

      // Obter o estágio com as questões já associadas
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          questions: true,
          test: true,
          TestStage: {
            include: {
              test: true
            }
          }
        }
      });

      if (!stage) {
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }
      
      // Verificar se o estágio está associado a um teste diretamente ou via TestStage
      let testId = stage.testId;
      
      // Se não houver testId direto, tentar obter do TestStage
      if (!testId && stage.TestStage && stage.TestStage.length > 0) {
        testId = stage.TestStage[0].testId;
      }
      
      if (!testId) {
        return res.status(404).json({ error: 'Estágio não está associado a nenhum teste' });
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
      const existingQuestionIds = stage.questions.map(q => q.id);
      
      // Filtrar apenas as questões que ainda não estão associadas
      const newQuestionIds = questionIds.filter(qId => !existingQuestionIds.includes(qId));

      if (newQuestionIds.length === 0) {
        return res.status(400).json({ error: 'Todas as questões selecionadas já estão associadas a este estágio' });
      }

      // Conectar as novas questões ao estágio
      const updatedStage = await prisma.stage.update({
        where: { id },
        data: {
          questions: {
            connect: newQuestionIds.map(qId => ({ id: qId }))
          }
        },
        include: {
          questions: true
        }
      });

      return res.status(201).json({ 
        success: true,
        addedCount: newQuestionIds.length,
        alreadyExistingCount: existingQuestionIds.length,
        stage: updatedStage
      });
    } catch (error) {
      console.error('Erro ao adicionar questões ao estágio:', error);
      return res.status(500).json({ error: 'Erro ao adicionar questões ao estágio' });
    }
  } 
  // Obter todas as questões de um estágio (GET)
  else if (req.method === 'GET') {
    try {
      // Obter o estágio com todas as questões
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              options: true,
              categories: true
            }
          }
        }
      });

      if (!stage) {
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }

      // Retornar as questões do estágio
      return res.status(200).json(stage.questions);
    } catch (error) {
      console.error('Erro ao obter questões do estágio:', error);
      return res.status(500).json({ error: 'Erro ao obter questões do estágio' });
    }
  }
  // Remover uma questão do estágio (DELETE)
  else if (req.method === 'DELETE') {
    try {
      const { questionId } = req.query;

      if (typeof questionId !== 'string') {
        return res.status(400).json({ error: 'ID da questão inválido' });
      }

      // Verificar se a questão está associada ao estágio
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          questions: {
            where: {
              id: questionId
            }
          }
        }
      });

      if (!stage || stage.questions.length === 0) {
        return res.status(404).json({ error: 'Questão não encontrada neste estágio' });
      }

      // Desconectar a questão do estágio
      await prisma.stage.update({
        where: { id },
        data: {
          questions: {
            disconnect: { id: questionId }
          }
        }
      });

      return res.status(200).json({ success: true, message: 'Questão removida do estágio com sucesso' });
    } catch (error) {
      console.error('Erro ao remover questão do estágio:', error);
      return res.status(500).json({ error: 'Erro ao remover questão do estágio' });
    }
  }
  // Método não permitido
  else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
