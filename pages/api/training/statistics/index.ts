import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    // Obter ID do usuário da sessão
    const userId = session.user.id;

    // Verificar se o usuário é um estudante
    const student = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Student" WHERE "userId" = ${userId}
    `;

    if (!student || student.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Usuário não é um estudante' 
      });
    }

    const studentId = student[0].id;

    // Buscar estatísticas do estudante
    const totalCoursesResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count 
      FROM "CourseEnrollment" 
      WHERE "studentId" = ${studentId}
    `;
    
    const totalCourses = parseInt(totalCoursesResult[0].count);

    // Buscar cursos completados
    const completedCoursesResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(DISTINCT ce.id) as count
      FROM "CourseEnrollment" ce
      JOIN "TrainingCourse" tc ON ce."courseId" = tc.id
      WHERE ce."studentId" = ${studentId}
      AND (
        SELECT COUNT(tl.id) = COUNT(lp.id)
        FROM "TrainingModule" tm 
        JOIN "TrainingLesson" tl ON tl."moduleId" = tm.id 
        LEFT JOIN "LessonProgress" lp ON lp."lessonId" = tl.id AND lp."studentId" = ${studentId} AND lp.completed = true
        WHERE tm."courseId" = tc.id AND COUNT(tl.id) > 0
      )
    `;
    
    const completedCourses = parseInt(completedCoursesResult[0].count);

    // Buscar cursos em progresso
    const inProgressCoursesResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(DISTINCT ce.id) as count
      FROM "CourseEnrollment" ce
      JOIN "TrainingCourse" tc ON ce."courseId" = tc.id
      JOIN "TrainingModule" tm ON tm."courseId" = tc.id
      JOIN "TrainingLesson" tl ON tl."moduleId" = tm.id
      JOIN "LessonProgress" lp ON lp."lessonId" = tl.id AND lp."studentId" = ${studentId} AND lp.completed = true
      WHERE ce."studentId" = ${studentId}
      AND (
        SELECT COUNT(tl2.id) > COUNT(lp2.id)
        FROM "TrainingModule" tm2 
        JOIN "TrainingLesson" tl2 ON tl2."moduleId" = tm2.id 
        LEFT JOIN "LessonProgress" lp2 ON lp2."lessonId" = tl2.id AND lp2."studentId" = ${studentId} AND lp2.completed = true
        WHERE tm2."courseId" = tc.id
      )
    `;
    
    const inProgressCourses = parseInt(inProgressCoursesResult[0].count);

    // Buscar média de pontuação em testes
    const averageScoreResult = await prisma.$queryRaw<{ average: string | null }[]>`
      SELECT COALESCE(ROUND(AVG(ta.score)), 0) as average
      FROM "TestAttempt" ta
      WHERE ta."studentId" = ${studentId}
    `;
    
    const averageScore = averageScoreResult[0].average ? parseInt(averageScoreResult[0].average) : 0;

    // Buscar total de lições completadas
    const totalLessonsCompletedResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM "LessonProgress" lp
      WHERE lp."studentId" = ${studentId}
      AND lp.completed = true
    `;
    
    const totalLessonsCompleted = parseInt(totalLessonsCompletedResult[0].count);

    // Buscar tempo total gasto (em minutos)
    const totalTimeSpentResult = await prisma.$queryRaw<{ total: string | null }[]>`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (tal."endTime" - tal."startTime")) / 60), 0) as total
      FROM "TrainingAccessLog" tal
      WHERE tal."studentId" = ${studentId}
      AND tal."endTime" IS NOT NULL
    `;
    
    const totalTimeSpent = totalTimeSpentResult[0].total ? Math.round(parseFloat(totalTimeSpentResult[0].total)) : 0;

    // Montar objeto de estatísticas
    const statistics = {
      totalCourses,
      completedCourses,
      inProgressCourses,
      averageScore,
      totalLessonsCompleted,
      totalTimeSpent
    };

    return res.status(200).json(statistics);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar estatísticas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
