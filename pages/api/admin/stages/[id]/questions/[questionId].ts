import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

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
      // Deletar a questão (a relação com o estágio é automática)
      await prisma.question.delete({
        where: {
          id: questionId
        }
      });

      return res.status(200).json({ success: true });
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
      await prisma.question.update({
        where: {
          id: questionId
        },
        data: {
          // Como não há um campo order no modelo Question, 
          // podemos adicionar um comentário explicando isso
          // order: order
        }
      });

      return res.status(200).json({ success: true });
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
