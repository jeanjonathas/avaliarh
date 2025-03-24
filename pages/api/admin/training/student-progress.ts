import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { getToken } from 'next-auth/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const token = await getToken({ req });
  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
    // Buscar progresso dos alunos
    const companyId = 1; // You need to define companyId
    const studentProgress = await prisma.$queryRaw`
      SELECT 
        s.id AS "studentId",
        s.name AS "studentName",
        s.email AS "studentEmail",
        c.id AS "courseId",
        c.name AS "courseName",
        m.id AS "moduleId",
        m.name AS "moduleName",
        CAST(COUNT(DISTINCT lp."lessonId") AS FLOAT) / COUNT(DISTINCT l.id) * 100 AS "progress",
        MAX(lp."completedAt") AS "lastActivity",
        CASE
          WHEN COUNT(DISTINCT lp."lessonId") = COUNT(DISTINCT l.id) THEN 'completed'
          WHEN COUNT(DISTINCT lp."lessonId") > 0 THEN 'in_progress'
          ELSE 'not_started'
        END AS "status"
      FROM "Student" s
      JOIN "CourseEnrollment" ce ON s.id = ce."studentId"
      JOIN "TrainingCourse" c ON ce."courseId" = c.id
      JOIN "TrainingModule" m ON c.id = m."courseId"
      JOIN "TrainingLesson" l ON m.id = l."moduleId"
      LEFT JOIN "LessonProgress" lp ON l.id = lp."lessonId" AND lp."studentId" = s.id
      WHERE s."companyId" = ${companyId}
      GROUP BY s.id, c.id, m.id
      ORDER BY s.name, c.name, m.name
    `;

    res.status(200).json(studentProgress);
  } catch (error) {
    console.error('Erro ao buscar progresso dos alunos:', error);
    res.status(500).json({ message: 'Erro ao buscar progresso dos alunos' });
  }
}
