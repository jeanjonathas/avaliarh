import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]'/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
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
  const { courseId, startDate, endDate } = req.query;

  if (!courseId) {
    return res.status(400).json({ error: 'ID do curso é obrigatório' });
  }

  // Parse dates or use defaults
  const parsedStartDate = startDate 
    ? new Date(startDate as string) 
    : new Date(new Date().setMonth(new Date().getMonth() - 3));
  
  const parsedEndDate = endDate 
    ? new Date(endDate as string) 
    : new Date();

  try {
    // Check if the course belongs to the company
    const courseData = await prisma.$queryRaw`
      SELECT id, name FROM "Course" WHERE id = ${courseId} AND "companyId" = ${companyId}
    `;

    if (!Array.isArray(courseData) || courseData.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado ou não pertence à empresa' });
    }

    const courseName = courseData[0].name;

    // Get total enrolled and completed users
    const enrollmentData = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT e."userId") as "totalEnrolled",
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM "CourseProgress" cp 
            WHERE cp."userId" = e."userId" 
            AND cp."courseId" = e."courseId" 
            AND cp.completed = true
            AND cp."completedAt" BETWEEN ${parsedStartDate} AND ${parsedEndDate}
          ) THEN e."userId" 
          ELSE NULL 
        END) as "totalCompleted"
      FROM "Enrollment" e
      WHERE e."courseId" = ${courseId}
    `;

    const totalEnrolled = parseInt(enrollmentData[0]?.totalEnrolled || '0');
    const totalCompleted = parseInt(enrollmentData[0]?.totalCompleted || '0');
    const completionRate = totalEnrolled > 0 ? (totalCompleted / totalEnrolled) * 100 : 0;

    // Get average score for completed courses
    const scoreData = await prisma.$queryRaw`
      SELECT AVG(cp.score) as "averageScore"
      FROM "CourseProgress" cp
      WHERE cp."courseId" = ${courseId}
      AND cp.completed = true
      AND cp."completedAt" BETWEEN ${parsedStartDate} AND ${parsedEndDate}
    `;

    const averageScore = parseFloat(scoreData[0]?.averageScore || '0');

    // Get average time to complete (in days)
    const timeData = await prisma.$queryRaw`
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM (cp."completedAt" - e."enrollmentDate")) / 86400
        ) as "averageTimeToComplete"
      FROM "CourseProgress" cp
      JOIN "Enrollment" e ON e."userId" = cp."userId" AND e."courseId" = cp."courseId"
      WHERE cp."courseId" = ${courseId}
      AND cp.completed = true
      AND cp."completedAt" BETWEEN ${parsedStartDate} AND ${parsedEndDate}
    `;

    const averageTimeToComplete = parseFloat(timeData[0]?.averageTimeToComplete || '0');

    // Get department statistics
    const departmentStats = await prisma.$queryRaw`
      SELECT 
        d.name as "departmentName",
        COUNT(DISTINCT e."userId") as "enrolled",
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM "CourseProgress" cp 
            WHERE cp."userId" = e."userId" 
            AND cp."courseId" = e."courseId" 
            AND cp.completed = true
            AND cp."completedAt" BETWEEN ${parsedStartDate} AND ${parsedEndDate}
          ) THEN e."userId" 
          ELSE NULL 
        END) as "completed",
        AVG(CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM "CourseProgress" cp 
            WHERE cp."userId" = e."userId" 
            AND cp."courseId" = e."courseId" 
            AND cp.completed = true
            AND cp."completedAt" BETWEEN ${parsedStartDate} AND ${parsedEndDate}
          ) THEN cp.score
          ELSE NULL
        END) as "averageScore"
      FROM "Enrollment" e
      JOIN "User" u ON e."userId" = u.id
      LEFT JOIN "Department" d ON u."departmentId" = d.id
      LEFT JOIN "CourseProgress" cp ON cp."userId" = e."userId" AND cp."courseId" = e."courseId"
      WHERE e."courseId" = ${courseId}
      GROUP BY d.name
      ORDER BY "enrolled" DESC
    `;

    // Calculate completion rate for each department
    const departmentStatsWithRate = (departmentStats as any[]).map(dept => ({
      departmentName: dept.departmentName || 'Sem departamento',
      enrolled: parseInt(dept.enrolled),
      completed: parseInt(dept.completed),
      completionRate: dept.enrolled > 0 ? (dept.completed / dept.enrolled) * 100 : 0,
      averageScore: parseFloat(dept.averageScore || '0')
    }));

    // Get monthly completions
    const monthlyData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(cp."completedAt", 'YYYY-MM') as "yearMonth",
        TO_CHAR(cp."completedAt", 'Mon/YYYY') as "monthLabel",
        COUNT(DISTINCT cp."userId") as "completions"
      FROM "CourseProgress" cp
      WHERE cp."courseId" = ${courseId}
      AND cp.completed = true
      AND cp."completedAt" BETWEEN ${parsedStartDate} AND ${parsedEndDate}
      GROUP BY "yearMonth", "monthLabel"
      ORDER BY "yearMonth"
    `;

    const monthlyCompletions = (monthlyData as any[]).map(month => ({
      month: month.monthLabel,
      completions: parseInt(month.completions)
    }));

    // Prepare response
    const completionData = {
      courseId,
      courseName,
      totalEnrolled,
      totalCompleted,
      completionRate,
      averageScore,
      averageTimeToComplete,
      startDate: parsedStartDate.toISOString(),
      endDate: parsedEndDate.toISOString(),
      departmentStats: departmentStatsWithRate,
      monthlyCompletions
    };

    return res.status(200).json(completionData);
  } catch (error) {
    console.error('Error fetching completion data:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados de conclusão do curso' });
  }
}
