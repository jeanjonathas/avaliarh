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

  const { id, stageId } = req.query
  
  if (typeof id !== 'string' || typeof stageId !== 'string') {
    return res.status(400).json({ error: 'IDs inválidos' })
  }

  // Verificar se o teste existe
  try {
    const testExists = await prisma.test.findUnique({
      where: {
        id: id
      }
    });

    if (!testExists) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar teste:', error);
    return res.status(500).json({ error: 'Erro ao verificar teste' });
  }

  // Remover estágio do teste (DELETE)
  if (req.method === 'DELETE') {
    try {
      console.log(`[API] Tentando remover etapa ${stageId} do teste ${id}`);
      
      // Verificar se a relação TestStage existe
      const testStageExists = await prisma.testStage.findFirst({
        where: {
          testId: id,
          stageId: stageId
        }
      });

      if (!testStageExists) {
        console.log(`[API] Relação TestStage não encontrada para testId=${id} e stageId=${stageId}`);
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }
      
      console.log(`[API] Relação TestStage encontrada:`, testStageExists);
      
      // Verificar se a etapa tem perguntas associadas
      const questions = await prisma.question.findMany({
        where: {
          stageId: stageId
        }
      });
      
      if (questions.length > 0) {
        console.log(`[API] A etapa ${stageId} tem ${questions.length} perguntas associadas.`);
        
        // Verificar se a etapa está sendo usada apenas neste teste
        const otherTestStages = await prisma.testStage.findMany({
          where: {
            stageId: stageId,
            testId: {
              not: id
            }
          }
        });
        
        // Se a etapa não está sendo usada em outros testes, não precisamos fazer nada com as perguntas
        // Elas permanecerão associadas à etapa, que não estará mais associada a nenhum teste
        if (otherTestStages.length === 0) {
          console.log(`[API] A etapa ${stageId} não está associada a outros testes, mantendo as perguntas associadas a ela.`);
        }
      }
      
      // Remover a relação TestStage (não a etapa em si)
      const result = await prisma.testStage.deleteMany({
        where: {
          testId: id,
          stageId: stageId
        }
      });
      
      console.log(`[API] Resultado da remoção:`, result);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }

      return res.status(200).json({ 
        success: true,
        message: 'Etapa removida com sucesso',
        questionsCount: questions.length,
        stageRemoved: false // A etapa em si não foi removida, apenas desassociada do teste
      });
    } catch (error) {
      console.error('Erro ao remover etapa do teste:', error);
      return res.status(500).json({ error: 'Erro ao remover etapa do teste: ' + (error.message || 'Erro desconhecido') });
    }
  } 
  // Atualizar ordem do estágio no teste (PATCH)
  else if (req.method === 'PATCH') {
    try {
      const { order } = req.body;
      console.log(`[API] Tentando atualizar ordem da etapa ${stageId} do teste ${id} para ${order}`);

      if (order === undefined) {
        return res.status(400).json({ error: 'Ordem é obrigatória' });
      }

      // Verificar se a relação TestStage existe
      const testStageExists = await prisma.testStage.findFirst({
        where: {
          testId: id,
          stageId: stageId
        }
      });

      if (!testStageExists) {
        console.log(`[API] Relação TestStage não encontrada para testId=${id} e stageId=${stageId}`);
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }
      
      console.log(`[API] Relação TestStage encontrada:`, testStageExists);

      // Atualizar a ordem na tabela TestStage
      const result = await prisma.testStage.updateMany({
        where: {
          testId: id,
          stageId: stageId
        },
        data: {
          order: order
        }
      });
      
      console.log(`[API] Resultado da atualização:`, result);

      if (result.count === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro ao atualizar ordem do estágio:', error);
      return res.status(500).json({ error: 'Erro ao atualizar ordem do estágio: ' + (error.message || 'Erro desconhecido') });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
