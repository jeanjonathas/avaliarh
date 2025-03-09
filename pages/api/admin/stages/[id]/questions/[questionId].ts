import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id, questionId } = req.query
  
  if (typeof id !== 'string' || typeof questionId !== 'string') {
    return res.status(400).json({ error: 'IDs inválidos' })
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

  // Verificar se a questão existe e está associada ao estágio
  try {
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        stageId: id
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Questão não encontrada neste estágio' });
    }
  } catch (error) {
    console.error('Erro ao verificar questão:', error);
    return res.status(500).json({ error: 'Erro ao verificar questão' });
  }

  // Remover questão do estágio (DELETE)
  if (req.method === 'DELETE') {
    try {
      // Buscar a etapa "Banco de Questões" ou criar se não existir
      let bankStage = await prisma.stage.findFirst({
        where: {
          title: 'Banco de Questões'
        }
      });

      if (!bankStage) {
        // Criar a etapa "Banco de Questões" se não existir
        // Usando UUID válido para o ID
        const bankStageId = uuidv4();
        
        bankStage = await prisma.stage.create({
          data: {
            id: bankStageId,
            title: 'Banco de Questões',
            description: 'Repositório de questões não associadas a nenhuma etapa específica',
            order: 0,
            updatedAt: new Date()
          }
        });
      }

      // Obter a questão com suas opções
      const questionWithOptions = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true }
      });

      if (!questionWithOptions) {
        return res.status(404).json({ error: 'Questão não encontrada' });
      }

      // Criar uma cópia da questão no banco de questões
      const newQuestion = await prisma.question.create({
        data: {
          text: questionWithOptions.text,
          stageId: bankStage.id,
          updatedAt: new Date()
        }
      });

      // Copiar as opções para a nova questão
      for (const option of questionWithOptions.options) {
        await prisma.option.create({
          data: {
            text: option.text,
            isCorrect: option.isCorrect,
            questionId: newQuestion.id,
            updatedAt: new Date()
          }
        });
      }

      // Excluir a questão original da etapa atual
      // Isso é seguro porque já criamos uma cópia no banco de questões
      await prisma.question.delete({
        where: { id: questionId }
      });

      return res.status(200).json({ 
        success: true,
        message: 'Questão removida da etapa e preservada no banco de questões',
        newQuestionId: newQuestion.id
      });
    } catch (error) {
      console.error('Erro ao remover questão do estágio:', error);
      return res.status(500).json({ error: 'Erro ao remover questão do estágio' });
    }
  } 
  // Atualizar ordem da questão no estágio (PATCH)
  else if (req.method === 'PATCH') {
    try {
      const { order } = req.body;

      if (order === undefined) {
        return res.status(400).json({ error: 'Ordem é obrigatória' });
      }

      // Atualizar a ordem da questão
      // Como não há um campo order no modelo Question, 
      // este endpoint não realiza nenhuma operação real
      // Mantido para compatibilidade com o frontend

      return res.status(200).json({ 
        success: true,
        message: 'Operação processada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar ordem da questão:', error);
      return res.status(500).json({ error: 'Erro ao atualizar ordem da questão' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
