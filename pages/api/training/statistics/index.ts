import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    await reconnectPrisma()
  const session = await getServerSession(req, res, authOptions);
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
      AND ce."completionDate" IS NOT NULL
    `;
    
    const completedCourses = parseInt(completedCoursesResult[0].count);

    // Buscar cursos em progresso
    const inProgressCoursesResult = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(DISTINCT ce.id) as count
      FROM "CourseEnrollment" ce
      WHERE ce."studentId" = ${studentId}
      AND ce.progress > 0
      AND ce.progress < 100
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
      SELECT COALESCE(SUM("timeSpent") / 60, 0) as total
      FROM "TrainingAccessLog" tal
      WHERE tal."studentId" = ${studentId}
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
