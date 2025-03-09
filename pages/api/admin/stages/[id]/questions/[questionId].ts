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
      where: { id },
      include: {
        test: true // Incluir o teste associado à etapa
      }
    });

    if (!stage) {
      return res.status(404).json({ error: 'Estágio não encontrado' });
    }
    
    // Verificar se o estágio está associado a um teste
    if (!stage.testId) {
      return res.status(400).json({ error: 'Estágio não está associado a um teste' });
    }
  } catch (error) {
    console.error('Erro ao verificar estágio:', error);
    return res.status(500).json({ error: 'Erro ao verificar estágio' });
  }

  // Verificar se a questão existe
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    // Obter o estágio com o teste associado
    const stage = await prisma.stage.findUnique({
      where: { id },
      include: {
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
    
    // Verificar se existe uma associação entre a questão e a etapa
    const stageQuestion = await prisma.stageQuestion.findUnique({
      where: {
        stageId_questionId: {
          stageId: id,
          questionId: questionId
        }
      }
    });
    
    if (req.method === 'DELETE' && !stageQuestion) {
      return res.status(404).json({ error: 'Questão não está associada a esta etapa neste teste' });
    }
  } catch (error) {
    console.error('Erro ao verificar questão:', error);
    return res.status(500).json({ error: 'Erro ao verificar questão' });
  }

  // Remover questão do estágio (DELETE)
  if (req.method === 'DELETE') {
    try {
      // Obter o estágio com o teste associado
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
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
      
      // Remover a associação na tabela StageQuestion
      // Importante: Não estamos excluindo a questão, apenas removendo a associação com a etapa
      await prisma.stageQuestion.delete({
        where: {
          stageId_questionId: {
            stageId: id,
            questionId: questionId
          }
        }
      });
      
      // Remover a associação na tabela TestQuestion usando SQL raw para evitar problemas com o cliente Prisma
      try {
        // Usar SQL raw para remover a associação na tabela TestQuestion
        await prisma.$executeRaw`DELETE FROM "TestQuestion" WHERE "stageId" = ${id} AND "questionId" = ${questionId} AND "testId" = ${testId}`;
      } catch (error) {
        console.error('Erro ao remover associação da tabela TestQuestion:', error);
        // Continuar mesmo se houver erro
      }
      
      // Nota: Não estamos excluindo a questão do banco de dados, apenas removendo a associação com o teste e a etapa

      return res.status(200).json({ 
        success: true,
        message: 'Questão removida da etapa com sucesso'
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

      // Atualizar a ordem da questão na tabela StageQuestion
      await prisma.stageQuestion.update({
        where: {
          stageId_questionId: {
            stageId: id,
            questionId: questionId
          }
        },
        data: {
          order: order
        }
      });

      return res.status(200).json({ 
        success: true,
        message: 'Ordem da questão atualizada com sucesso'
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
