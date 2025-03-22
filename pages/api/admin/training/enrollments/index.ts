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

  // Handle GET request - List users with enrollment status for a course
  if (req.method === 'GET') {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'ID do curso é obrigatório' });
    }

    try {
      // First check if the course belongs to the company
      const courseExists = await prisma.$queryRaw`
        SELECT id FROM "Course" WHERE id = ${courseId} AND "companyId" = ${companyId}
      `;

      if (!Array.isArray(courseExists) || courseExists.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado ou não pertence à empresa' });
      }

      // Get all users from the company with their enrollment status
      const users = await prisma.$queryRaw`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          d.name as department,
          r.name as role,
          CASE WHEN e.id IS NOT NULL THEN true ELSE false END as enrolled
        FROM "User" u
        LEFT JOIN "Department" d ON u."departmentId" = d.id
        LEFT JOIN "Role" r ON u."roleId" = r.id
        LEFT JOIN "Enrollment" e ON e."userId" = u.id AND e."courseId" = ${courseId}
        WHERE u."companyId" = ${companyId}
        ORDER BY u.name
      `;

      return res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users with enrollment status:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
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
        SELECT id FROM "Course" WHERE id = ${courseId} AND "companyId" = ${companyId}
      `;

      if (!Array.isArray(courseExists) || courseExists.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado ou não pertence à empresa' });
      }

      // Check if the user belongs to the company
      const userExists = await prisma.$queryRaw`
        SELECT id FROM "User" WHERE id = ${userId} AND "companyId" = ${companyId}
      `;

      if (!Array.isArray(userExists) || userExists.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado ou não pertence à empresa' });
      }

      if (action === 'enroll') {
        // Check if enrollment already exists
        const enrollmentExists = await prisma.$queryRaw`
          SELECT id FROM "Enrollment" WHERE "userId" = ${userId} AND "courseId" = ${courseId}
        `;

        if (!Array.isArray(enrollmentExists) || enrollmentExists.length === 0) {
          // Create enrollment
          await prisma.$executeRaw`
            INSERT INTO "Enrollment" ("userId", "courseId", "enrollmentDate", "status")
            VALUES (${userId}, ${courseId}, NOW(), 'active')
          `;
        }

        return res.status(200).json({ message: 'Usuário matriculado com sucesso' });
      } else {
        // Unenroll - Delete enrollment if exists
        await prisma.$executeRaw`
          DELETE FROM "Enrollment" WHERE "userId" = ${userId} AND "courseId" = ${courseId}
        `;

        return res.status(200).json({ message: 'Matrícula removida com sucesso' });
      }
    } catch (error) {
      console.error('Error updating enrollment:', error);
      return res.status(500).json({ error: 'Erro ao atualizar matrícula' });
    }
  }

  // If the request method is not supported
  return res.status(405).json({ error: 'Método não permitido' });
}
