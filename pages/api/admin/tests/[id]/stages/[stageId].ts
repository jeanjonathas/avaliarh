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
    const testExists = await prisma.$queryRaw`
      SELECT id FROM "tests" WHERE id = ${id}
    `;

    if (!Array.isArray(testExists) || testExists.length === 0) {
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
      const testStageExists = await prisma.$queryRaw`
        SELECT ts.id 
        FROM "TestStage" ts
        WHERE ts."testId" = ${id}
        AND ts."stageId" = ${stageId}
      `;

      if (!Array.isArray(testStageExists) || testStageExists.length === 0) {
        console.log(`[API] Relação TestStage não encontrada para testId=${id} e stageId=${stageId}`);
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }
      
      console.log(`[API] Relação TestStage encontrada:`, testStageExists);
      
      // Remover a relação TestStage (não a etapa em si)
      const result = await prisma.$executeRaw`
        DELETE FROM "TestStage"
        WHERE "testId" = ${id}
        AND "stageId" = ${stageId}
      `;
      
      console.log(`[API] Resultado da remoção:`, result);

      if (result === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }

      return res.status(200).json({ success: true });
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
      const testStageExists = await prisma.$queryRaw`
        SELECT ts.id 
        FROM "TestStage" ts
        WHERE ts."testId" = ${id}
        AND ts."stageId" = ${stageId}
      `;

      if (!Array.isArray(testStageExists) || testStageExists.length === 0) {
        console.log(`[API] Relação TestStage não encontrada para testId=${id} e stageId=${stageId}`);
        return res.status(404).json({ error: 'Etapa não encontrada neste teste' });
      }
      
      console.log(`[API] Relação TestStage encontrada:`, testStageExists);

      // Atualizar a ordem na tabela TestStage
      const result = await prisma.$executeRaw`
        UPDATE "TestStage"
        SET "order" = ${order}
        WHERE "testId" = ${id}
        AND "stageId" = ${stageId}
      `;
      
      console.log(`[API] Resultado da atualização:`, result);

      if (result === 0) {
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
