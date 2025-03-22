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

  // Handle GET request - List questions for a test
  if (req.method === 'GET') {
    const { testId } = req.query;

    if (!testId) {
      return res.status(400).json({ error: 'ID do teste é obrigatório' });
    }

    try {
      // Check if the test exists and belongs to the company
      const testCheck = await prisma.$queryRaw`
        SELECT id, "companyId" FROM "Test" WHERE id = ${testId}
      `;

      if (!Array.isArray(testCheck) || testCheck.length === 0) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      if (testCheck[0].companyId !== companyId) {
        return res.status(403).json({ error: 'Acesso negado a este teste' });
      }

      // Get questions for this test
      const questions = await prisma.$queryRaw`
        SELECT 
          q.id, 
          q.text, 
          q.points
        FROM "Question" q
        WHERE q."testId" = ${testId}
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

      return res.status(200).json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ error: 'Erro ao buscar questões' });
    }
  }

  // Handle POST request - Create question
  if (req.method === 'POST') {
    const { text, points, options, testId } = req.body;

    if (!text || !testId || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'Texto da questão, ID do teste e pelo menos 2 opções são obrigatórios' 
      });
    }

    // Check if at least one option is marked as correct
    if (!options.some(option => option.isCorrect)) {
      return res.status(400).json({ 
        error: 'Pelo menos uma opção deve ser marcada como correta' 
      });
    }

    try {
      // Check if the test exists and belongs to the company
      const testCheck = await prisma.$queryRaw`
        SELECT id, "companyId" FROM "Test" WHERE id = ${testId}
      `;

      if (!Array.isArray(testCheck) || testCheck.length === 0) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      if (testCheck[0].companyId !== companyId) {
        return res.status(403).json({ error: 'Acesso negado a este teste' });
      }

      // Create the question
      await prisma.$executeRaw`
        INSERT INTO "Question" (
          text, 
          points, 
          "testId"
        ) VALUES (
          ${text},
          ${points || 1},
          ${testId}
        )
      `;

      // Get the created question ID
      const questionResult = await prisma.$queryRaw`
        SELECT id FROM "Question" WHERE id = (SELECT lastval())
      `;
      
      const questionId = questionResult[0].id;

      // Create options for the question
      for (const option of options) {
        await prisma.$executeRaw`
          INSERT INTO "Option" (
            text, 
            "isCorrect", 
            "questionId"
          ) VALUES (
            ${option.text},
            ${option.isCorrect},
            ${questionId}
          )
        `;
      }

      // Get the created question with options
      const createdQuestion = await prisma.$queryRaw`
        SELECT 
          id, 
          text, 
          points
        FROM "Question"
        WHERE id = ${questionId}
      `;

      const createdOptions = await prisma.$queryRaw`
        SELECT 
          id, 
          text, 
          "isCorrect"
        FROM "Option"
        WHERE "questionId" = ${questionId}
        ORDER BY id
      `;

      return res.status(201).json({
        ...createdQuestion[0],
        options: createdOptions
      });
    } catch (error) {
      console.error('Error creating question:', error);
      return res.status(500).json({ error: 'Erro ao criar questão' });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ error: 'Método não permitido' });
}
