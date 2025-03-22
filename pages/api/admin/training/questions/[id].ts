import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../../lib/prisma';
import { Prisma } from '@prisma/client';

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
    return res.status(400).json({ error: 'ID da questão é obrigatório' });
  }

  // Check if the question exists
  const questionCheck = await prisma.$queryRaw`
    SELECT q.id, t."companyId"
    FROM "Question" q
    JOIN "Test" t ON q."testId" = t.id
    WHERE q.id = ${id}
  `;

  if (!Array.isArray(questionCheck) || questionCheck.length === 0) {
    return res.status(404).json({ error: 'Questão não encontrada' });
  }

  if (questionCheck[0].companyId !== companyId) {
    return res.status(403).json({ error: 'Acesso negado a esta questão' });
  }

  // Handle GET request - Get question details
  if (req.method === 'GET') {
    try {
      const question = await prisma.$queryRaw`
        SELECT 
          q.id, 
          q.text, 
          q.points,
          q."testId"
        FROM "Question" q
        WHERE q.id = ${id}
      `;

      // Get options for this question
      const options = await prisma.$queryRaw`
        SELECT 
          o.id, 
          o.text, 
          o."isCorrect"
        FROM "Option" o
        WHERE o."questionId" = ${id}
        ORDER BY o.id
      `;

      const questionWithOptions = {
        ...question[0],
        options
      };

      return res.status(200).json(questionWithOptions);
    } catch (error) {
      console.error('Error fetching question details:', error);
      return res.status(500).json({ error: 'Erro ao buscar detalhes da questão' });
    }
  }

  // Handle PUT request - Update question
  if (req.method === 'PUT') {
    const { text, points, options, testId } = req.body;

    if (!text || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'Texto da questão e pelo menos 2 opções são obrigatórios' 
      });
    }

    // Check if at least one option is marked as correct
    if (!options.some(option => option.isCorrect)) {
      return res.status(400).json({ 
        error: 'Pelo menos uma opção deve ser marcada como correta' 
      });
    }

    try {
      // If testId is provided, check if it exists and belongs to the company
      if (testId) {
        const testCheck = await prisma.$queryRaw`
          SELECT id, "companyId" FROM "Test" WHERE id = ${testId}
        `;

        if (!Array.isArray(testCheck) || testCheck.length === 0) {
          return res.status(404).json({ error: 'Teste não encontrado' });
        }

        if (testCheck[0].companyId !== companyId) {
          return res.status(403).json({ error: 'Acesso negado a este teste' });
        }
      }

      // Update the question
      await prisma.$executeRaw`
        UPDATE "Question"
        SET 
          text = ${text},
          points = ${points || 1}
          ${testId ? Prisma.sql`, "testId" = ${testId}` : Prisma.sql``}
        WHERE id = ${id}
      `;

      // Delete existing options
      await prisma.$executeRaw`
        DELETE FROM "Option"
        WHERE "questionId" = ${id}
      `;

      // Create new options
      for (const option of options) {
        await prisma.$executeRaw`
          INSERT INTO "Option" (
            text, 
            "isCorrect", 
            "questionId"
          ) VALUES (
            ${option.text},
            ${option.isCorrect},
            ${id}
          )
        `;
      }

      // Get the updated question with options
      const updatedQuestion = await prisma.$queryRaw`
        SELECT 
          id, 
          text, 
          points,
          "testId"
        FROM "Question"
        WHERE id = ${id}
      `;

      const updatedOptions = await prisma.$queryRaw`
        SELECT 
          id, 
          text, 
          "isCorrect"
        FROM "Option"
        WHERE "questionId" = ${id}
        ORDER BY id
      `;

      return res.status(200).json({
        ...updatedQuestion[0],
        options: updatedOptions
      });
    } catch (error) {
      console.error('Error updating question:', error);
      return res.status(500).json({ error: 'Erro ao atualizar questão' });
    }
  }

  // Handle DELETE request - Delete question
  if (req.method === 'DELETE') {
    try {
      // First, delete all options for this question
      await prisma.$executeRaw`
        DELETE FROM "Option"
        WHERE "questionId" = ${id}
      `;

      // Then, delete the question itself
      await prisma.$executeRaw`
        DELETE FROM "Question"
        WHERE id = ${id}
      `;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting question:', error);
      return res.status(500).json({ error: 'Erro ao excluir questão' });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ error: 'Método não permitido' });
}
