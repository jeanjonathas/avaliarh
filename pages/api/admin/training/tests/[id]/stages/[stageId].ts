import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../../lib/auth';
import { prisma } from '../../../../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  // Get user and check if they are an admin
  const user = await prisma.$queryRaw`
    SELECT u.id, u."companyId", u.role
    FROM "User" u
    WHERE u.id = ${session.user.id}
  `;

  if (!Array.isArray(user) || user.length === 0 || (user[0].role !== 'COMPANY_ADMIN' && user[0].role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado' 
    });
  }

  const companyId = user[0].companyId;
  const { id, stageId } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'ID do teste é obrigatório' 
    });
  }

  if (!stageId || typeof stageId !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'ID da etapa é obrigatório' 
    });
  }

  // Check if the test exists and belongs to the company
  const testCheck = await prisma.$queryRaw`
    SELECT id, "companyId", "testType" FROM "Test" WHERE id = ${id}
  `;

  if (!Array.isArray(testCheck) || testCheck.length === 0) {
    return res.status(404).json({ 
      success: false,
      error: 'Teste não encontrado' 
    });
  }

  if (testCheck[0].companyId !== companyId || testCheck[0].testType !== 'training') {
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado a este teste' 
    });
  }

  // Verificar se a associação entre teste e etapa existe
  const testStageCheck = await prisma.$queryRaw`
    SELECT ts.id, ts."order"
    FROM "TestStage" ts
    WHERE ts."testId" = ${id} AND ts."stageId" = ${stageId}
  `;

  if (!Array.isArray(testStageCheck) || testStageCheck.length === 0) {
    return res.status(404).json({ 
      success: false,
      error: 'Associação entre teste e etapa não encontrada' 
    });
  }

  const testStageId = testStageCheck[0].id;

  // Handle PATCH request - Update stage order
  if (req.method === 'PATCH') {
    try {
      const { order } = req.body;
      console.log(`[API] Atualizando ordem da etapa ${stageId} no teste ${id} para ${order}`);

      if (order === undefined) {
        return res.status(400).json({ 
          success: false,
          error: 'Ordem da etapa é obrigatória' 
        });
      }

      // Atualizar a ordem da etapa usando Prisma Client
      await prisma.testStage.update({
        where: { id: testStageId },
        data: { order: order }
      });

      console.log(`[API] Ordem da etapa ${stageId} atualizada com sucesso para ${order}`);

      return res.status(200).json({
        success: true,
        message: 'Ordem da etapa atualizada com sucesso'
      });
    } catch (error) {
      console.error(`[API] Erro ao atualizar ordem da etapa ${stageId}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao atualizar ordem da etapa' 
      });
    }
  }

  // Handle DELETE request - Remove stage from test
  if (req.method === 'DELETE') {
    try {
      console.log(`[API] Removendo etapa ${stageId} do teste ${id}`);

      // Verificar se a etapa tem perguntas associadas
      const questionsCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "Question" 
        WHERE "stageId" = ${stageId}
      `;
      
      const count = Number(questionsCount[0].count);
      
      if (count > 0) {
        return res.status(400).json({
          success: false,
          error: `Não é possível remover a etapa pois ela possui ${count} perguntas associadas. Remova as perguntas primeiro.`
        });
      }

      // Remover a associação entre teste e etapa usando Prisma Client
      await prisma.testStage.delete({
        where: { id: testStageId }
      });

      console.log(`[API] Etapa ${stageId} removida com sucesso do teste ${id}`);

      return res.status(200).json({
        success: true,
        message: 'Etapa removida do teste com sucesso'
      });
    } catch (error) {
      console.error(`[API] Erro ao remover etapa ${stageId} do teste ${id}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao remover etapa do teste' 
      });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ 
    success: false,
    error: 'Método não permitido' 
  });
}
