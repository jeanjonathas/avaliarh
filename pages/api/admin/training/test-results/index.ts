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
  
  // Lidar com diferentes métodos HTTP
  if (req.method === 'GET') {
    try {
      // Obter parâmetros de consulta
      const { testId, studentId, page = '1', limit = '10' } = req.query;
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const offset = (pageNumber - 1) * limitNumber;
      
      console.log('[API] Buscando resultados de testes de treinamento...');
      
      // Construir a consulta base para resultados de testes
      let queryParams: any[] = [companyId];
      let whereClause = `WHERE t."companyId" = $1`;
      let paramIndex = 2;
      
      // Adicionar filtro por teste específico
      if (testId) {
        whereClause += ` AND ta."testId" = $${paramIndex}`;
        queryParams.push(testId);
        paramIndex++;
      }
      
      // Adicionar filtro por estudante específico
      if (studentId) {
        whereClause += ` AND ta."studentId" = $${paramIndex}`;
        queryParams.push(studentId);
        paramIndex++;
      }
      
      // Consulta para obter resultados de testes com paginação
      const resultsQuery = `
        SELECT 
          ta.id, 
          ta."testId", 
          ta."studentId", 
          ta."startTime", 
          ta."endTime", 
          ta.score, 
          ta.passed,
          t.id as "test_id",
          t.name as "test_name",
          t.description as "test_description",
          s.id as "student_id",
          s."enrollmentDate" as "student_enrollmentDate",
          s.progress as "student_progress",
          u.id as "user_id",
          u.name as "user_name",
          u.email as "user_email",
          u.role as "user_role"
        FROM "TestAttempt" ta
        JOIN "TrainingTest" t ON ta."testId" = t.id
        JOIN "Student" s ON ta."studentId" = s.id
        JOIN "User" u ON s."userId" = u.id
        ${whereClause}
        ORDER BY ta."endTime" DESC NULLS LAST
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      // Consulta para contar o total de resultados
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "TestAttempt" ta
        JOIN "TrainingTest" t ON ta."testId" = t.id
        JOIN "Student" s ON ta."studentId" = s.id
        JOIN "User" u ON s."userId" = u.id
        ${whereClause}
      `;
      
      // Executar as consultas
      queryParams.push(limitNumber, offset);
      const resultsRaw = await prisma.$queryRawUnsafe(resultsQuery, ...queryParams);
      const countResult = await prisma.$queryRawUnsafe(countQuery, ...queryParams.slice(0, paramIndex - 1));
      
      // Formatar os resultados
      const results = Array.isArray(resultsRaw) ? resultsRaw.map(result => ({
        id: result.id,
        testId: result.testId,
        studentId: result.studentId,
        startTime: result.startTime,
        endTime: result.endTime,
        score: result.score ? Number(result.score) : null,
        passed: result.passed,
        test: {
          id: result.test_id,
          name: result.test_name,
          description: result.test_description
        },
        student: {
          id: result.student_id,
          enrollmentDate: result.student_enrollmentDate,
          progress: Number(result.student_progress),
          user: {
            id: result.user_id,
            name: result.user_name,
            email: result.user_email,
            role: result.user_role
          }
        }
      })) : [];
      
      // Para cada resultado, buscar as respostas
      const resultsWithAnswers = await Promise.all(
        results.map(async (result) => {
          const answersRaw = await prisma.$queryRaw`
            SELECT 
              qa.id, 
              qa."questionId", 
              qa."optionId", 
              qa."isCorrect",
              tq.text as "question_text",
              tq.type as "question_type",
              to.text as "option_text"
            FROM "QuestionAnswer" qa
            LEFT JOIN "TrainingQuestion" tq ON qa."questionId" = tq.id
            LEFT JOIN "TrainingOption" to ON qa."optionId" = to.id
            WHERE qa."attemptId" = ${result.id}
          `;
          
          const answers = Array.isArray(answersRaw) ? answersRaw.map(answer => ({
            id: answer.id,
            questionId: answer.questionId,
            optionId: answer.optionId,
            isCorrect: answer.isCorrect,
            question: {
              id: answer.questionId,
              text: answer.question_text,
              type: answer.question_type
            },
            option: answer.optionId ? {
              id: answer.optionId,
              text: answer.option_text
            } : null
          })) : [];
          
          return {
            ...result,
            answers
          };
        })
      );
      
      // Calcular o total de páginas
      const total = Number(Array.isArray(countResult) && countResult.length > 0 ? countResult[0].total : 0);
      const totalPages = Math.ceil(total / limitNumber);
      
      console.log(`[API] Encontrados ${results.length} resultados de testes de treinamento`);
      
      // Retornar os resultados com metadados de paginação
      return res.status(200).json({
        success: true,
        results: resultsWithAnswers,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages
        }
      });
    } catch (error) {
      console.error('Erro ao buscar resultados de testes:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao buscar resultados de testes' 
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { testId, studentId, startTime, endTime, score, answers, passed } = req.body;
      
      // Validar campos obrigatórios
      if (!testId || !studentId) {
        return res.status(400).json({ 
          success: false,
          error: 'ID do teste e ID do estudante são obrigatórios' 
        });
      }
      
      // Verificar se o teste pertence à empresa do usuário
      const testCheck = await prisma.$queryRaw`
        SELECT t.id, t."companyId" 
        FROM "TrainingTest" t
        WHERE t.id = ${testId} AND t."companyId" = ${companyId}
      `;
      
      if (!Array.isArray(testCheck) || testCheck.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Teste não encontrado ou não pertence à sua empresa' 
        });
      }
      
      // Verificar se o estudante existe e pertence à empresa
      const studentCheck = await prisma.$queryRaw`
        SELECT s.id FROM "Student" s
        JOIN "User" u ON s."userId" = u.id
        WHERE s.id = ${studentId} AND u."companyId" = ${companyId}
      `;
      
      if (!Array.isArray(studentCheck) || studentCheck.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Estudante não encontrado ou não pertence à sua empresa' 
        });
      }
      
      // Criar a tentativa de teste
      const testAttemptRaw = await prisma.$queryRaw`
        INSERT INTO "TestAttempt" (
          id,
          "testId",
          "studentId",
          "startTime",
          "endTime",
          score,
          passed,
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          ${testId},
          ${studentId},
          ${startTime ? new Date(startTime) : new Date()},
          ${endTime ? new Date(endTime) : null},
          ${score !== undefined ? score : null},
          ${passed !== undefined ? passed : null},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING id, "testId", "studentId", "startTime", "endTime", score, passed
      `;
      
      // Garantir que o resultado seja tratado corretamente
      const testAttempt = Array.isArray(testAttemptRaw) && testAttemptRaw.length > 0 
        ? {
            ...testAttemptRaw[0],
            score: testAttemptRaw[0].score ? Number(testAttemptRaw[0].score) : null
          }
        : null;
      
      // Se houver respostas, salvá-las
      if (answers && Array.isArray(answers) && answers.length > 0 && testAttempt) {
        for (const answer of answers) {
          await prisma.$executeRaw`
            INSERT INTO "QuestionAnswer" (
              id,
              "attemptId",
              "questionId",
              "optionId",
              "isCorrect",
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              ${testAttempt.id},
              ${answer.questionId},
              ${answer.optionId || null},
              ${answer.isCorrect !== undefined ? answer.isCorrect : null},
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `;
        }
      }
      
      // Atualizar o progresso do estudante se necessário
      if (passed) {
        await prisma.$executeRaw`
          UPDATE "Student"
          SET progress = LEAST(progress + 0.1, 1.0)
          WHERE id = ${studentId}
        `;
      }
      
      console.log(`[API] Tentativa de teste registrada com sucesso. ID: ${testAttempt?.id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Tentativa de teste registrada com sucesso',
        testAttempt
      });
    } catch (error) {
      console.error('Erro ao salvar tentativa de teste:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao salvar tentativa de teste' 
      });
    }
  } else {
    // Se o método HTTP não for suportado
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ 
      success: false,
      error: `Método ${req.method} não permitido` 
    });
  }
}
