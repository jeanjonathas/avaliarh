import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'ID do teste é obrigatório' 
    });
  }

  // Check if the test exists, belongs to the company, and is of type 'training'
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

  // Handle GET request - Get test details
  if (req.method === 'GET') {
    try {
      console.log(`[API] Buscando detalhes do teste de treinamento: ${id}`);
      
      const testRaw = await prisma.$queryRaw`
        SELECT 
          t.id, 
          t.title, 
          t.description, 
          t."timeLimit", 
          t."cutoffScore",
          t.active,
          t."createdAt",
          t."updatedAt",
          t."testType"
        FROM "Test" t
        WHERE t.id = ${id}
      `;

      if (!Array.isArray(testRaw) || testRaw.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Teste não encontrado' 
        });
      }

      // Converter BigInt para Number para evitar erro de serialização
      const test = {
        ...testRaw[0],
        timeLimit: testRaw[0].timeLimit ? Number(testRaw[0].timeLimit) : null,
        cutoffScore: testRaw[0].cutoffScore ? Number(testRaw[0].cutoffScore) : null
      };

      // Buscar os estágios (etapas) associados ao teste
      console.log(`[API] Buscando etapas para o teste ${id}...`);
      const stagesRaw = await prisma.$queryRaw`
        SELECT 
          s.id,
          s.title,
          s.description,
          s."order",
          s."questionType",
          s."createdAt",
          s."updatedAt"
        FROM "Stage" s
        WHERE s."testId" = ${id}
        ORDER BY s."order" ASC
      `;
      
      const stages = Array.isArray(stagesRaw) ? stagesRaw : [];
      
      console.log(`[API] ${stages.length} etapas encontradas para o teste ${id}`);
      
      // Verificar se há etapas com a mesma ordem
      const orderCounts = stages.reduce((acc, stage) => {
        acc[stage.order] = (acc[stage.order] || 0) + 1;
        return acc;
      }, {});
      
      const hasDuplicateOrders = Object.values(orderCounts).some(count => (count as number) > 1);
      
      if (hasDuplicateOrders) {
        console.log("[API] Detectadas etapas com a mesma ordem. Corrigindo...");
        
        // Corrigir as ordens para garantir que sejam sequenciais (0, 1, 2, ...)
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          
          // Atualizar a ordem no banco de dados
          await prisma.$executeRaw`
            UPDATE "Stage"
            SET "order" = ${i}
            WHERE id = ${stage.id}
          `;
          
          // Atualizar a ordem no objeto para retornar ao cliente
          stage.order = i;
        }
      }
      
      // Para cada estágio, buscar as perguntas
      const stagesWithQuestions = await Promise.all(
        stages.map(async (stage) => {
          const questionsRaw = await prisma.$queryRaw`
            SELECT 
              q.id,
              q.text,
              q.type,
              q.difficulty,
              q."createdAt",
              q."updatedAt"
            FROM "Question" q
            WHERE q."stageId" = ${stage.id} AND q."questionType" = 'training'
          `;
          
          const questions = Array.isArray(questionsRaw) ? questionsRaw : [];
          
          // Para cada questão, buscar suas categorias
          const questionsWithCategories = await Promise.all(
            questions.map(async (question) => {
              const categoriesRaw = await prisma.$queryRaw`
                SELECT c.id, c.name
                FROM "Category" c
                JOIN "_CategoryToQuestion" ctq ON c.id = ctq."A"
                WHERE ctq."B" = ${question.id} AND c."categoryType" = 'training'
              `;
              
              const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
              
              return {
                ...question,
                categories
              };
            })
          );
          
          return {
            ...stage,
            questions: questionsWithCategories
          };
        })
      );
      
      // Retornar o teste com suas etapas e perguntas
      return res.status(200).json({
        success: true,
        test,
        stages: stagesWithQuestions
      });
    } catch (error) {
      console.error(`[API] Erro ao buscar detalhes do teste ${id}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao buscar detalhes do teste' 
      });
    }
  }

  // Handle PUT request - Update test
  if (req.method === 'PUT') {
    try {
      const { title, description, timeLimit, cutoffScore, active } = req.body;
      console.log(`[API] Atualizando teste de treinamento ${id}:`, { title, description, timeLimit, cutoffScore, active });

      if (!title) {
        return res.status(400).json({ 
          success: false,
          error: 'Título do teste é obrigatório' 
        });
      }

      await prisma.$executeRaw`
        UPDATE "Test"
        SET 
          title = ${title},
          description = ${description || ''},
          "timeLimit" = ${timeLimit ? parseInt(timeLimit) : null},
          "cutoffScore" = ${cutoffScore ? parseInt(cutoffScore) : 70},
          active = ${active === undefined ? true : active},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      // Get the updated test
      const updatedTestRaw = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "timeLimit", 
          "cutoffScore",
          active,
          "createdAt",
          "updatedAt",
          "testType"
        FROM "Test"
        WHERE id = ${id}
      `;

      // Converter BigInt para Number para evitar erro de serialização
      const updatedTest = {
        ...updatedTestRaw[0],
        timeLimit: updatedTestRaw[0].timeLimit ? Number(updatedTestRaw[0].timeLimit) : null,
        cutoffScore: updatedTestRaw[0].cutoffScore ? Number(updatedTestRaw[0].cutoffScore) : null
      };

      console.log(`[API] Teste de treinamento ${id} atualizado com sucesso`);

      return res.status(200).json({
        success: true,
        message: 'Teste atualizado com sucesso',
        test: updatedTest
      });
    } catch (error) {
      console.error(`[API] Erro ao atualizar teste ${id}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao atualizar teste' 
      });
    }
  }

  // Handle DELETE request - Delete test
  if (req.method === 'DELETE') {
    try {
      console.log(`[API] Excluindo teste de treinamento ${id}`);
      
      // Verificar se o teste tem questões associadas
      const questionsCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "Question" q 
        JOIN "Stage" s ON q."stageId" = s.id 
        WHERE s."testId" = ${id} AND q."questionType" = 'training'
      `;
      
      const count = Number(questionsCount[0].count);
      
      if (count > 0) {
        return res.status(400).json({
          success: false,
          error: `Não é possível excluir o teste pois ele possui ${count} questões associadas. Remova as questões primeiro.`
        });
      }
      
      // Excluir o teste
      await prisma.$executeRaw`
        DELETE FROM "Test" WHERE id = ${id}
      `;
      
      console.log(`[API] Teste de treinamento ${id} excluído com sucesso`);
      
      return res.status(200).json({
        success: true,
        message: 'Teste excluído com sucesso'
      });
    } catch (error) {
      console.error(`[API] Erro ao excluir teste ${id}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao excluir teste'
      });
    }
  }

  // Handle PATCH request - Update test status or specific fields
  if (req.method === 'PATCH') {
    try {
      const { active } = req.body;
      console.log(`[API] Atualizando status do teste de treinamento ${id}:`, { active });

      if (active === undefined) {
        return res.status(400).json({ 
          success: false,
          error: 'Status do teste é obrigatório' 
        });
      }

      await prisma.$executeRaw`
        UPDATE "Test"
        SET 
          active = ${active},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      // Get the updated test
      const updatedTestRaw = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "timeLimit", 
          "cutoffScore",
          active,
          "createdAt",
          "updatedAt",
          "testType"
        FROM "Test"
        WHERE id = ${id}
      `;

      // Converter BigInt para Number para evitar erro de serialização
      const updatedTest = {
        ...updatedTestRaw[0],
        timeLimit: updatedTestRaw[0].timeLimit ? Number(updatedTestRaw[0].timeLimit) : null,
        cutoffScore: updatedTestRaw[0].cutoffScore ? Number(updatedTestRaw[0].cutoffScore) : null
      };

      console.log(`[API] Status do teste de treinamento ${id} atualizado com sucesso para ${active ? 'ativo' : 'inativo'}`);

      return res.status(200).json({
        success: true,
        message: `Teste ${active ? 'ativado' : 'desativado'} com sucesso`,
        test: updatedTest
      });
    } catch (error) {
      console.error(`[API] Erro ao atualizar status do teste ${id}:`, error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao atualizar status do teste' 
      });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ 
    success: false,
    error: 'Método não permitido' 
  });
}
