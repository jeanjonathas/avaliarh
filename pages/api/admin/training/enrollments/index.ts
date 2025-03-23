import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Get user and check if they are an admin
    const user = await prisma.$queryRaw`
      SELECT * FROM "User" 
      WHERE id = ${session.user.id}
    `;

    if (!Array.isArray(user) || user.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Check if user is an admin
    if (user[0].role !== Role.COMPANY_ADMIN && user[0].role !== Role.SUPER_ADMIN && user[0].role !== Role.INSTRUCTOR) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
    }

    const companyId = user[0].companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Usuário não está associado a uma empresa' });
    }

    // Handle GET request - Get all enrollments
    if (req.method === 'GET') {
      const { courseId } = req.query;

      try {
        if (courseId) {
          // Get all students enrolled in the specified course
          const studentsWithEnrollments = await prisma.$queryRaw`
            SELECT 
              s.id as "studentId", 
              s."userId",
              u.name as "studentName", 
              u.email as "studentEmail",
              u.role as "studentRole",
              COUNT(ce.id) as "enrollmentCount",
              ce."courseId",
              c.name as "courseName",
              c.description as "courseDescription"
            FROM "Student" s
            JOIN "User" u ON s."userId" = u.id
            JOIN "CourseEnrollment" ce ON ce."studentId" = s.id
            JOIN "TrainingCourse" c ON c.id = ce."courseId"
            WHERE s."companyId" = ${companyId}
              AND ce."courseId" = ${courseId}
            GROUP BY s.id, s."userId", u.name, u.email, u.role, ce."courseId", c.name, c.description
            ORDER BY u.name
          `;

          // Convert BigInt to Number before returning
          const serializedData = (studentsWithEnrollments as any[]).map(student => ({
            ...student,
            enrollmentCount: Number(student.enrollmentCount),
            student: {
              name: student.studentName,
              email: student.studentEmail,
              role: student.studentRole
            },
            course: {
              id: student.courseId,
              name: student.courseName,
              description: student.courseDescription
            }
          }));

          return res.status(200).json(serializedData);
        } else {
          // Get all students with enrollments
          const studentsWithEnrollments = await prisma.$queryRaw`
            SELECT 
              s.id as "studentId", 
              s."userId",
              u.name as "studentName", 
              u.email as "studentEmail",
              u.role as "studentRole",
              COUNT(ce.id) as "enrollmentCount",
              ce."courseId",
              c.name as "courseName",
              c.description as "courseDescription"
            FROM "Student" s
            JOIN "User" u ON s."userId" = u.id
            JOIN "CourseEnrollment" ce ON ce."studentId" = s.id
            JOIN "TrainingCourse" c ON c.id = ce."courseId"
            WHERE s."companyId" = ${companyId}
            GROUP BY s.id, s."userId", u.name, u.email, u.role, ce."courseId", c.name, c.description
            ORDER BY u.name
          `;

          // Convert BigInt to Number before returning
          const serializedData = (studentsWithEnrollments as any[]).map(student => ({
            ...student,
            enrollmentCount: Number(student.enrollmentCount),
            student: {
              name: student.studentName,
              email: student.studentEmail,
              role: student.studentRole
            },
            course: {
              id: student.courseId,
              name: student.courseName,
              description: student.courseDescription
            }
          }));

          return res.status(200).json(serializedData);
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error);
        return res.status(500).json({ error: 'Erro ao buscar matrículas' });
      }
    }

    // Handle POST request - Enroll or unenroll a user
    if (req.method === 'POST') {
      const { userId, courseId, action } = req.body;

      if (!userId || !courseId || !action) {
        return res.status(400).json({ 
          error: 'ID do usuário, ID do curso e ação (enroll/unenroll) são obrigatórios' 
        });
      }

      if (action !== 'enroll' && action !== 'unenroll') {
        return res.status(400).json({ error: 'Ação inválida. Use "enroll" ou "unenroll"' });
      }

      try {
        // Check if the course belongs to the company
        const courseExists = await prisma.$queryRaw`
          SELECT id FROM "TrainingCourse" 
          WHERE id = ${courseId} AND "companyId" = ${companyId}
        `;

        if (!Array.isArray(courseExists) || courseExists.length === 0) {
          return res.status(404).json({ error: 'Curso não encontrado ou não pertence à empresa' });
        }

        // Check if the student exists and belongs to the company
        const student = await prisma.$queryRaw`
          SELECT id FROM "Student" 
          WHERE "userId" = ${userId} AND "companyId" = ${companyId}
        `;

        if (!Array.isArray(student) || student.length === 0) {
          return res.status(404).json({ error: 'Estudante não encontrado ou não pertence à empresa' });
        }

        const studentId = student[0].id;

        if (action === 'enroll') {
          // Check if the user is already enrolled
          const enrollmentExists = await prisma.$queryRaw`
            SELECT id FROM "CourseEnrollment" 
            WHERE "studentId" = ${studentId} AND "courseId" = ${courseId}
          `;

          if (Array.isArray(enrollmentExists) && enrollmentExists.length > 0) {
            return res.status(400).json({ error: 'Estudante já está matriculado neste curso' });
          }

          // Enroll the user
          await prisma.$executeRaw`
            INSERT INTO "CourseEnrollment" ("id", "studentId", "courseId", "enrollmentDate", "progress", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${studentId}, ${courseId}, NOW(), 0, NOW(), NOW())
          `;

          // Get all students for the company
          const students = await prisma.$queryRaw`
            SELECT 
              s.id as "studentId", 
              s."userId",
              u.name as "studentName", 
              u.email as "studentEmail",
              u.role as "studentRole"
            FROM "Student" s
            JOIN "User" u ON s."userId" = u.id
            WHERE s."companyId" = ${companyId}
            ORDER BY u.name
          `;

          return res.status(200).json({ 
            message: 'Estudante matriculado com sucesso',
            students: (students as any[]).map(student => ({
              id: student.studentId,
              name: student.studentName,
              email: student.studentEmail
            })),
            enrolledStudent: {
              id: studentId,
              userId: userId
            }
          });
        } else {
          // Unenroll the user - Delete enrollment if exists
          const result = await prisma.$executeRaw`
            DELETE FROM "CourseEnrollment" 
            WHERE "studentId" = ${studentId} AND "courseId" = ${courseId}
          `;

          // Get all students for the company
          const students = await prisma.$queryRaw`
            SELECT 
              s.id as "studentId", 
              s."userId",
              u.name as "studentName", 
              u.email as "studentEmail",
              u.role as "studentRole"
            FROM "Student" s
            JOIN "User" u ON s."userId" = u.id
            WHERE s."companyId" = ${companyId}
            ORDER BY u.name
          `;

          return res.status(200).json({ 
            message: 'Matrícula do estudante removida com sucesso',
            students: (students as any[]).map(student => ({
              id: student.studentId,
              name: student.studentName,
              email: student.studentEmail
            }))
          });
        }
      } catch (error) {
        console.error('Error enrolling/unenrolling user:', error);
        return res.status(500).json({ error: 'Erro ao processar matrícula' });
      }
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Error in enrollment handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
