import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { Prisma } from '@prisma/client';

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

  if (req.method === 'GET') {
    try {
      console.log('[API] Buscando testes de treinamento...');
      
      // Sempre usar 'training' como tipo de teste para este endpoint
      const testType = 'training';
      
      // Buscar todos os testes de treinamento para a empresa
      const testsRaw = await prisma.$queryRaw`
        SELECT 
          t.id, 
          t.title, 
          t.description, 
          t."timeLimit", 
          t."cutoffScore",
          t.active,
          t."createdAt", 
          t."updatedAt",
          t."testType",
          (SELECT COUNT(*) FROM "Stage" s WHERE s."testId" = t.id) as "sectionsCount",
          (
            SELECT COUNT(*) 
            FROM "Question" q 
            JOIN "Stage" s ON q."stageId" = s.id 
            WHERE s."testId" = t.id AND q."questionType" = 'training'
          ) as "questionsCount"
        FROM "Test" t
        WHERE t."companyId" = ${companyId} AND t."testType" = ${testType}
        ORDER BY t."createdAt" DESC
      `;
      
      // Converter BigInt para Number para evitar erro de serialização
      const tests = Array.isArray(testsRaw) ? testsRaw.map(test => ({
        ...test,
        sectionsCount: Number(test.sectionsCount),
        questionsCount: Number(test.questionsCount),
        timeLimit: test.timeLimit ? Number(test.timeLimit) : null,
        cutoffScore: test.cutoffScore ? Number(test.cutoffScore) : null
      })) : [];
      
      console.log(`[API] Encontrados ${tests.length} testes de treinamento`);
      
      return res.status(200).json({ 
        success: true,
        tests 
      });
    } catch (error) {
      console.error('Erro ao buscar testes de treinamento:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao buscar testes de treinamento',
        tests: [] 
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, timeLimit, cutoffScore, active } = req.body;
      console.log('[API] Criando novo teste de treinamento:', { title, description, timeLimit, cutoffScore, active });

      if (!title) {
        return res.status(400).json({ 
          success: false,
          error: 'Título do teste é obrigatório' 
        });
      }

      // Criar o teste
      const newTestResult = await prisma.$queryRaw`
        INSERT INTO "Test" (
          id,
          title, 
          description, 
          "timeLimit", 
          "cutoffScore",
          active,
          "testType",
          "companyId",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          ${title},
          ${description || ''},
          ${timeLimit ? parseInt(timeLimit) : null},
          ${cutoffScore ? parseInt(cutoffScore) : 70},
          ${active === undefined ? true : active},
          'training',
          ${companyId},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id, title, description, "timeLimit", "cutoffScore", active, "testType", "companyId", "createdAt", "updatedAt"
      `;

      // Garantir que o resultado seja tratado corretamente
      const newTest = Array.isArray(newTestResult) && newTestResult.length > 0 
        ? {
            ...newTestResult[0],
            timeLimit: newTestResult[0].timeLimit ? Number(newTestResult[0].timeLimit) : null,
            cutoffScore: newTestResult[0].cutoffScore ? Number(newTestResult[0].cutoffScore) : null
          }
        : { id: 'unknown', title, description };

      console.log(`[API] Teste de treinamento criado com sucesso. ID: ${newTest.id}`);

      return res.status(201).json({ 
        success: true, 
        message: 'Teste de treinamento criado com sucesso',
        test: newTest
      });
    } catch (error) {
      console.error('Erro ao criar teste de treinamento:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao criar teste de treinamento' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ 
      success: false,
      error: `Método ${req.method} não permitido` 
    });
  }
}
