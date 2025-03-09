import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[API] Recebida requisição ${req.method} para /api/admin/stages/${req.query.id}/questions/${req.query.questionId}`);
  
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    console.log(`[API] Requisição não autorizada`);
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id, questionId } = req.query
  
  if (typeof id !== 'string' || typeof questionId !== 'string') {
    console.log(`[API] IDs inválidos: id=${id}, questionId=${questionId}`);
    return res.status(400).json({ error: 'IDs inválidos' })
  }

  // Método DELETE - Remover questão da etapa
  if (req.method === 'DELETE') {
    try {
      console.log(`[API] Iniciando processo de remoção da questão ${questionId} da etapa ${id}`);
      
      // Verificar se a questão existe
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        console.log(`[API] Questão ${questionId} não encontrada`);
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
        console.log(`[API] Estágio ${id} não encontrado`);
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }
      
      // Verificar se o estágio está associado a um teste diretamente ou via TestStage
      let testId = stage.testId;
      
      // Se não houver testId direto, tentar obter do TestStage
      if (!testId && stage.TestStage && stage.TestStage.length > 0) {
        testId = stage.TestStage[0].testId;
      }
      
      console.log(`[API] Estágio ${id} associado ao teste ${testId || 'nenhum'}`);
      
      if (!testId) {
        console.log(`[API] Estágio ${id} não está associado a nenhum teste`);
        return res.status(400).json({ error: 'Estágio não está associado a nenhum teste' });
      }
      
      // Verificar se existe uma associação na tabela TestQuestion
      console.log(`[API] Verificando associação na tabela TestQuestion...`);
      const testQuestionResult = await prisma.$queryRaw`
        SELECT id FROM "TestQuestion" 
        WHERE "stageId" = ${id} AND "questionId" = ${questionId} AND "testId" = ${testId}
      `;
      
      const testQuestions = Array.isArray(testQuestionResult) ? testQuestionResult : [];
      console.log(`[API] Encontradas ${testQuestions.length} associações na tabela TestQuestion`);
      
      // Verificar se existe uma associação entre a questão e a etapa na tabela StageQuestion
      console.log(`[API] Verificando associação na tabela StageQuestion...`);
      const stageQuestion = await prisma.stageQuestion.findUnique({
        where: {
          stageId_questionId: {
            stageId: id,
            questionId: questionId
          }
        }
      });
      
      console.log(`[API] Associação na tabela StageQuestion: ${stageQuestion ? 'encontrada' : 'não encontrada'}`);
      
      // Se não houver associação em nenhuma das tabelas, retornar erro
      if (!stageQuestion && testQuestions.length === 0) {
        console.log(`[API] Questão não está associada a esta etapa neste teste`);
        return res.status(404).json({ error: 'Questão não está associada a esta etapa neste teste' });
      }
      
      // Remover a associação na tabela StageQuestion se existir
      if (stageQuestion) {
        console.log(`[API] Removendo associação da tabela StageQuestion...`);
        try {
          await prisma.stageQuestion.delete({
            where: {
              stageId_questionId: {
                stageId: id,
                questionId: questionId
              }
            }
          });
          console.log(`[API] Associação removida da tabela StageQuestion com sucesso`);
        } catch (error) {
          console.error('Erro ao remover associação da tabela StageQuestion:', error);
          // Continuar mesmo com erro, pois a associação pode existir apenas na tabela TestQuestion
        }
      } else {
        console.log(`[API] Não há associação na tabela StageQuestion para remover`);
      }
      
      // Remover a associação na tabela TestQuestion usando SQL raw
      console.log(`[API] Removendo associação da tabela TestQuestion...`);
      try {
        const result = await prisma.$executeRaw`DELETE FROM "TestQuestion" WHERE "stageId" = ${id} AND "questionId" = ${questionId} AND "testId" = ${testId}`;
        console.log(`[API] Associação removida da tabela TestQuestion com sucesso. Linhas afetadas: ${result}`);
      } catch (error) {
        console.error('Erro ao remover associação da tabela TestQuestion:', error);
        // Não retornar erro aqui, pois a associação pode não existir na tabela TestQuestion
      }
      
      // Retornar resposta de sucesso
      console.log(`[API] Questão removida da etapa com sucesso`);
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