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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'ID do teste é obrigatório' 
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

  // Handle POST request - Associate a stage with a test
  if (req.method === 'POST') {
    try {
      const { stageId, order } = req.body;
      console.log(`[API] Associando etapa ${stageId} ao teste ${id} com ordem ${order}`);

      if (!stageId) {
        return res.status(400).json({ 
          success: false,
          error: 'ID da etapa é obrigatório' 
        });
      }

      // Verificar se a etapa existe
      const stageCheck = await prisma.$queryRaw`
        SELECT id FROM "Stage" WHERE id = ${stageId}
      `;

      if (!Array.isArray(stageCheck) || stageCheck.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Etapa não encontrada' 
        });
      }

      // Verificar se a associação já existe
      const existingAssociation = await prisma.$queryRaw`
        SELECT id FROM "TestStage" WHERE "testId" = ${id} AND "stageId" = ${stageId}
      `;

      if (Array.isArray(existingAssociation) && existingAssociation.length > 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Esta etapa já está associada a este teste' 
        });
      }

      // Criar a associação entre teste e etapa usando Prisma Client em vez de raw query
      const testStage = await prisma.testStage.create({
        data: {
          id: undefined, // Deixar o Prisma gerar o UUID
          testId: id,
          stageId: stageId,
          order: order || 0,
        },
      });

      console.log(`[API] Etapa ${stageId} associada com sucesso ao teste ${id}, ID da associação: ${testStage.id}`);

      return res.status(201).json({
        success: true,
        message: 'Etapa associada ao teste com sucesso',
        id: testStage.id
      });
    } catch (error) {
      console.error(`[API] Erro ao associar etapa ao teste ${id}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao associar etapa ao teste' 
      });
    }
  }

  // Handle GET request - Get all stages associated with a test
  if (req.method === 'GET') {
    try {
      console.log(`[API] Buscando etapas do teste ${id}`);
      
      const stagesRaw = await prisma.$queryRaw`
        SELECT 
          ts.id as "testStageId",
          ts."testId",
          ts."stageId",
          ts."order",
          s.id,
          s.title,
          s.description,
          s."questionType",
          s."createdAt",
          s."updatedAt"
        FROM "TestStage" ts
        JOIN "Stage" s ON ts."stageId" = s.id
        WHERE ts."testId" = ${id}
        ORDER BY ts."order" ASC
      `;
      
      const stages = Array.isArray(stagesRaw) ? stagesRaw : [];
      
      console.log(`[API] ${stages.length} etapas encontradas para o teste ${id}`);
      
      return res.status(200).json({
        success: true,
        stages
      });
    } catch (error) {
      console.error(`[API] Erro ao buscar etapas do teste ${id}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao buscar etapas do teste' 
      });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ 
    success: false,
    error: 'Método não permitido' 
  });
}
