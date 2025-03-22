import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getSession({ req });
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Get user and check if they are an admin
  const user = await prisma.$queryRaw`
    SELECT u.id, u."companyId", r.name as role
    FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.id = ${session.user.id}
  `;

  if (!Array.isArray(user) || user.length === 0 || user[0].role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const companyId = user[0].companyId;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do teste é obrigatório' });
  }

  // Check if the test exists and belongs to the company
  const testCheck = await prisma.$queryRaw`
    SELECT id, "companyId" FROM "Test" WHERE id = ${id}
  `;

  if (!Array.isArray(testCheck) || testCheck.length === 0) {
    return res.status(404).json({ error: 'Teste não encontrado' });
  }

  if (testCheck[0].companyId !== companyId) {
    return res.status(403).json({ error: 'Acesso negado a este teste' });
  }

  // Handle GET request - Get test details
  if (req.method === 'GET') {
    try {
      const test = await prisma.$queryRaw`
        SELECT 
          t.id, 
          t.name, 
          t.description, 
          t."timeLimit", 
          t."passingScore",
          t.level,
          t."levelId"
        FROM "Test" t
        WHERE t.id = ${id}
      `;

      // Get questions for this test
      const questions = await prisma.$queryRaw`
        SELECT 
          q.id, 
          q.text, 
          q.points
        FROM "Question" q
        WHERE q."testId" = ${id}
        ORDER BY q.id
      `;

      // For each question, get its options
      for (const question of questions as any[]) {
        const options = await prisma.$queryRaw`
          SELECT 
            o.id, 
            o.text, 
            o."isCorrect"
          FROM "Option" o
          WHERE o."questionId" = ${question.id}
          ORDER BY o.id
        `;
        question.options = options;
      }

      const testWithQuestions = {
        ...test[0],
        questions
      };

      return res.status(200).json(testWithQuestions);
    } catch (error) {
      console.error('Error fetching test details:', error);
      return res.status(500).json({ error: 'Erro ao buscar detalhes do teste' });
    }
  }

  // Handle PUT request - Update test
  if (req.method === 'PUT') {
    const { name, description, timeLimit, passingScore } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do teste é obrigatório' });
    }

    try {
      await prisma.$executeRaw`
        UPDATE "Test"
        SET 
          name = ${name},
          description = ${description || ''},
          "timeLimit" = ${timeLimit || 30},
          "passingScore" = ${passingScore || 70}
        WHERE id = ${id}
      `;

      // Get the updated test
      const updatedTest = await prisma.$queryRaw`
        SELECT 
          id, 
          name, 
          description, 
          "timeLimit", 
          "passingScore",
          level,
          "levelId"
        FROM "Test"
        WHERE id = ${id}
      `;

      return res.status(200).json(updatedTest[0]);
    } catch (error) {
      console.error('Error updating test:', error);
      return res.status(500).json({ error: 'Erro ao atualizar teste' });
    }
  }

  // Handle DELETE request - Delete test
  if (req.method === 'DELETE') {
    try {
      // First, delete all options for all questions in this test
      await prisma.$executeRaw`
        DELETE FROM "Option"
        WHERE "questionId" IN (
          SELECT id FROM "Question" WHERE "testId" = ${id}
        )
      `;

      // Then, delete all questions for this test
      await prisma.$executeRaw`
        DELETE FROM "Question"
        WHERE "testId" = ${id}
      `;

      // Finally, delete the test itself
      await prisma.$executeRaw`
        DELETE FROM "Test"
        WHERE id = ${id}
      `;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting test:', error);
      return res.status(500).json({ error: 'Erro ao excluir teste' });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ error: 'Método não permitido' });
}
