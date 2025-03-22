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

  // Handle GET request - List tests
  if (req.method === 'GET') {
    const { level, levelId } = req.query;

    try {
      let tests = [];

      if (level && levelId) {
        // Get tests for a specific level (course, module, or lesson)
        tests = await prisma.$queryRaw`
          SELECT 
            t.id, 
            t.name, 
            t.description, 
            t."timeLimit", 
            t."passingScore",
            (SELECT COUNT(*) FROM "Question" q WHERE q."testId" = t.id) as "questionCount"
          FROM "Test" t
          WHERE t.level = ${level} AND t."levelId" = ${levelId} AND t."companyId" = ${companyId}
          ORDER BY t.name
        `;
      } else {
        // Get all tests for the company
        tests = await prisma.$queryRaw`
          SELECT 
            t.id, 
            t.name, 
            t.description, 
            t."timeLimit", 
            t."passingScore",
            t.level,
            t."levelId",
            (SELECT COUNT(*) FROM "Question" q WHERE q."testId" = t.id) as "questionCount"
          FROM "Test" t
          WHERE t."companyId" = ${companyId}
          ORDER BY t.name
        `;
      }

      return res.status(200).json(tests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      return res.status(500).json({ error: 'Erro ao buscar testes' });
    }
  }

  // Handle POST request - Create test
  if (req.method === 'POST') {
    const { name, description, timeLimit, passingScore, level, levelId } = req.body;

    if (!name || !level || !levelId) {
      return res.status(400).json({ 
        error: 'Nome, nível (course, module, lesson) e ID do nível são obrigatórios' 
      });
    }

    try {
      // Validate that the level and levelId exist and belong to the company
      let levelExists = false;
      
      if (level === 'course') {
        const course = await prisma.$queryRaw`
          SELECT id FROM "Course" WHERE id = ${levelId} AND "companyId" = ${companyId}
        `;
        levelExists = Array.isArray(course) && course.length > 0;
      } else if (level === 'module') {
        const moduleData = await prisma.$queryRaw`
          SELECT m.id 
          FROM "Module" m
          JOIN "Course" c ON m."courseId" = c.id
          WHERE m.id = ${levelId} AND c."companyId" = ${companyId}
        `;
        levelExists = Array.isArray(moduleData) && moduleData.length > 0;
      } else if (level === 'lesson') {
        const lesson = await prisma.$queryRaw`
          SELECT l.id 
          FROM "Lesson" l
          JOIN "Module" m ON l."moduleId" = m.id
          JOIN "Course" c ON m."courseId" = c.id
          WHERE l.id = ${levelId} AND c."companyId" = ${companyId}
        `;
        levelExists = Array.isArray(lesson) && lesson.length > 0;
      }

      if (!levelExists) {
        return res.status(404).json({ error: 'Nível não encontrado ou não pertence à empresa' });
      }

      // Create the test
      await prisma.$executeRaw`
        INSERT INTO "Test" (
          name, 
          description, 
          "timeLimit", 
          "passingScore", 
          level, 
          "levelId", 
          "companyId"
        ) VALUES (
          ${name},
          ${description || ''},
          ${timeLimit || 30},
          ${passingScore || 70},
          ${level},
          ${levelId},
          ${companyId}
        )
      `;

      // Get the created test ID
      const testResult = await prisma.$queryRaw`
        SELECT id FROM "Test" WHERE id = (SELECT lastval())
      `;
      
      const testId = testResult[0].id;

      // Get the created test
      const createdTest = await prisma.$queryRaw`
        SELECT 
          id, 
          name, 
          description, 
          "timeLimit", 
          "passingScore",
          level,
          "levelId"
        FROM "Test"
        WHERE id = ${testId}
      `;

      return res.status(201).json(createdTest[0]);
    } catch (error) {
      console.error('Error creating test:', error);
      return res.status(500).json({ error: 'Erro ao criar teste' });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ error: 'Método não permitido' });
}
