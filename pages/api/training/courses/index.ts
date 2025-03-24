import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../lib/prisma';
import { Prisma } from '@prisma/client';

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

    // Buscar cursos matriculados pelo estudante com informações de progresso
    const enrolledCourses = await prisma.$queryRaw<any[]>`
      SELECT 
        tc.id,
        tc.name as title,
        tc.description,
        ts.name as sectorName,
        (
          SELECT COUNT(*) 
          FROM "TrainingModule" tm 
          WHERE tm."courseId" = tc.id
        ) as "moduleCount",
        (
          SELECT COUNT(*) 
          FROM "TrainingModule" tm 
          JOIN "TrainingLesson" tl ON tl."moduleId" = tm.id 
          WHERE tm."courseId" = tc.id
        ) as "lessonCount",
        COALESCE(
          (
            SELECT 
              CASE 
                WHEN COUNT(tl.id) = 0 THEN 0
                ELSE ROUND((COUNT(lp.id) * 100.0) / COUNT(tl.id))
              END
            FROM "TrainingModule" tm 
            JOIN "TrainingLesson" tl ON tl."moduleId" = tm.id 
            LEFT JOIN "LessonProgress" lp ON lp."lessonId" = tl.id AND lp."studentId" = ${studentId} AND lp.completed = true
            WHERE tm."courseId" = tc.id
          ), 0
        ) as progress,
        (
          SELECT 
            CASE 
              WHEN COUNT(tl.id) > 0 AND COUNT(tl.id) = COUNT(lp.id) THEN true
              ELSE false
            END
          FROM "TrainingModule" tm 
          JOIN "TrainingLesson" tl ON tl."moduleId" = tm.id 
          LEFT JOIN "LessonProgress" lp ON lp."lessonId" = tl.id AND lp."studentId" = ${studentId} AND lp.completed = true
          WHERE tm."courseId" = tc.id
        ) as completed,
        NULL as "imageUrl"
      FROM "CourseEnrollment" ce
      JOIN "TrainingCourse" tc ON ce."courseId" = tc.id
      LEFT JOIN "TrainingSector" ts ON tc."sectorId" = ts.id
      WHERE ce."studentId" = ${studentId}
      ORDER BY ce."enrollmentDate" DESC
    `;

    // Formatar os resultados
    const formattedCourses = enrolledCourses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      sectorName: course.sectorName || 'Geral',
      moduleCount: Number(course.moduleCount),
      lessonCount: Number(course.lessonCount),
      progress: Number(course.progress),
      completed: Boolean(course.completed),
      imageUrl: course.imageUrl || '/images/default-course.jpg'
    }));

    return res.status(200).json(formattedCourses);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar cursos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
