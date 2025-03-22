import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

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
  const { courseId } = req.query;

  if (!courseId) {
    return res.status(400).json({ error: 'ID do curso é obrigatório' });
  }

  try {
    // Check if the course belongs to the company
    const courseExists = await prisma.$queryRaw`
      SELECT id FROM "Course" WHERE id = ${courseId} AND "companyId" = ${companyId}
    `;

    if (!Array.isArray(courseExists) || courseExists.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado ou não pertence à empresa' });
    }

    // Get course structure information
    const courseStructure = await prisma.$queryRaw`
      SELECT 
        c.id as "courseId",
        (SELECT COUNT(*) FROM "Module" m WHERE m."courseId" = c.id) as "totalModules",
        (
          SELECT COUNT(*) 
          FROM "Lesson" l 
          JOIN "Module" m ON l."moduleId" = m.id 
          WHERE m."courseId" = c.id
        ) as "totalLessons",
        (
          SELECT COUNT(*) 
          FROM "Test" t 
          WHERE (t.level = 'course' AND t."levelId" = c.id)
             OR (t.level = 'module' AND t."levelId" IN (
                  SELECT m.id FROM "Module" m WHERE m."courseId" = c.id
                ))
             OR (t.level = 'lesson' AND t."levelId" IN (
                  SELECT l.id 
                  FROM "Lesson" l 
                  JOIN "Module" m ON l."moduleId" = m.id 
                  WHERE m."courseId" = c.id
                ))
        ) as "totalTests"
      FROM "Course" c
      WHERE c.id = ${courseId}
    `;

    if (!Array.isArray(courseStructure) || courseStructure.length === 0) {
      return res.status(404).json({ error: 'Estrutura do curso não encontrada' });
    }

    const totalModules = parseInt(courseStructure[0].totalModules);
    const totalLessons = parseInt(courseStructure[0].totalLessons);
    const totalTests = parseInt(courseStructure[0].totalTests);

    // Get all enrolled students with their progress
    const enrolledStudents = await prisma.$queryRaw`
      SELECT 
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        d.name as "department",
        e."enrollmentDate"
      FROM "Enrollment" e
      JOIN "User" u ON e."userId" = u.id
      LEFT JOIN "Department" d ON u."departmentId" = d.id
      WHERE e."courseId" = ${courseId}
      ORDER BY u.name
    `;

    // For each student, get their progress details
    const studentProgress = await Promise.all(
      (enrolledStudents as any[]).map(async (student) => {
        // Get completed modules count
        const completedModulesResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT mp."moduleId") as "completedModules"
          FROM "ModuleProgress" mp
          JOIN "Module" m ON mp."moduleId" = m.id
          WHERE mp."userId" = ${student.userId}
          AND m."courseId" = ${courseId}
          AND mp.completed = true
        `;

        const completedModules = completedModulesResult[0]?.completedModules || 0;

        // Get completed lessons count
        const completedLessonsResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT lp."lessonId") as "completedLessons"
          FROM "LessonProgress" lp
          JOIN "Lesson" l ON lp."lessonId" = l.id
          JOIN "Module" m ON l."moduleId" = m.id
          WHERE lp."userId" = ${student.userId}
          AND m."courseId" = ${courseId}
          AND lp.completed = true
        `;

        const completedLessons = completedLessonsResult[0]?.completedLessons || 0;

        // Get completed tests and average score
        const testResultsData = await prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT tr."testId") as "completedTests",
            COALESCE(AVG(tr.score), 0) as "averageScore"
          FROM "TestResult" tr
          JOIN "Test" t ON tr."testId" = t.id
          WHERE tr."userId" = ${student.userId}
          AND (
            (t.level = 'course' AND t."levelId" = ${courseId})
            OR (t.level = 'module' AND t."levelId" IN (
                SELECT m.id FROM "Module" m WHERE m."courseId" = ${courseId}
              ))
            OR (t.level = 'lesson' AND t."levelId" IN (
                SELECT l.id 
                FROM "Lesson" l 
                JOIN "Module" m ON l."moduleId" = m.id 
                WHERE m."courseId" = ${courseId}
              ))
          )
        `;

        const completedTests = testResultsData[0]?.completedTests || 0;
        const averageScore = testResultsData[0]?.averageScore || 0;

        // Get time spent on course
        const timeSpentData = await prisma.$queryRaw`
          SELECT COALESCE(SUM(lp."timeSpent"), 0) as "totalTimeSpent"
          FROM "LessonProgress" lp
          JOIN "Lesson" l ON lp."lessonId" = l.id
          JOIN "Module" m ON l."moduleId" = m.id
          WHERE lp."userId" = ${student.userId}
          AND m."courseId" = ${courseId}
        `;

        const timeSpent = timeSpentData[0]?.totalTimeSpent || 0;

        // Get last activity
        const lastActivityData = await prisma.$queryRaw`
          SELECT 
            GREATEST(
              COALESCE(MAX(lp."updatedAt"), '1970-01-01'::timestamp),
              COALESCE(MAX(mp."updatedAt"), '1970-01-01'::timestamp),
              COALESCE(MAX(tr."submittedAt"), '1970-01-01'::timestamp)
            ) as "lastActivity"
          FROM "User" u
          LEFT JOIN "LessonProgress" lp ON lp."userId" = u.id
          LEFT JOIN "Lesson" l ON lp."lessonId" = l.id
          LEFT JOIN "Module" m1 ON l."moduleId" = m1.id
          LEFT JOIN "ModuleProgress" mp ON mp."userId" = u.id
          LEFT JOIN "Module" m2 ON mp."moduleId" = m2.id
          LEFT JOIN "TestResult" tr ON tr."userId" = u.id
          LEFT JOIN "Test" t ON tr."testId" = t.id
          WHERE u.id = ${student.userId}
          AND (
            m1."courseId" = ${courseId} OR
            m2."courseId" = ${courseId} OR
            (t.level = 'course' AND t."levelId" = ${courseId}) OR
            (t.level = 'module' AND t."levelId" IN (
              SELECT m.id FROM "Module" m WHERE m."courseId" = ${courseId}
            )) OR
            (t.level = 'lesson' AND t."levelId" IN (
              SELECT l.id 
              FROM "Lesson" l 
              JOIN "Module" m ON l."moduleId" = m.id 
              WHERE m."courseId" = ${courseId}
            ))
          )
        `;

        // Default to enrollment date if no activity found
        let lastActivity = lastActivityData[0]?.lastActivity || student.enrollmentDate;

        // Determine status
        let status = 'not_started';
        if (completedLessons > 0) {
          status = completedLessons === totalLessons ? 'completed' : 'in_progress';
        }

        return {
          userId: student.userId,
          userName: student.userName,
          userEmail: student.userEmail,
          department: student.department,
          enrollmentDate: student.enrollmentDate,
          completedModules: parseInt(completedModules),
          totalModules,
          completedLessons: parseInt(completedLessons),
          totalLessons,
          completedTests: parseInt(completedTests),
          totalTests,
          averageScore: parseFloat(averageScore),
          timeSpent: parseInt(timeSpent),
          lastActivity,
          status
        };
      })
    );

    return res.status(200).json(studentProgress);
  } catch (error) {
    console.error('Error fetching student progress:', error);
    return res.status(500).json({ error: 'Erro ao buscar progresso dos alunos' });
  }
}
