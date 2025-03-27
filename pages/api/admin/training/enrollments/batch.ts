import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Get user and check if they are an admin
  // Garantir que a conexão com o banco de dados esteja ativa
  await reconnectPrisma();
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
  const { courseId, action, userIds } = req.body;

  // Validate input
  if (!courseId || !action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ 
      error: 'ID do curso, ação (enroll/unenroll) e lista de IDs de usuários são obrigatórios' 
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

    // Check if all users belong to the company
    for (const userId of userIds) {
      const userExists = await prisma.$queryRaw`
        SELECT id FROM "User" WHERE id = ${userId} AND "companyId" = ${companyId}
      `;

      if (!Array.isArray(userExists) || userExists.length === 0) {
        return res.status(404).json({ 
          error: `Usuário com ID ${userId} não encontrado ou não pertence à empresa` 
        });
      }
    }

    if (action === 'enroll') {
      // For each user, check if enrollment exists and create if not
      for (const userId of userIds) {
        const enrollmentExists = await prisma.$queryRaw`
          SELECT id FROM "Enrollment" WHERE "userId" = ${userId} AND "courseId" = ${courseId}
        `;

        if (!Array.isArray(enrollmentExists) || enrollmentExists.length === 0) {
          await prisma.$executeRaw`
            INSERT INTO "Enrollment" ("userId", "courseId", "enrollmentDate", "status")
            VALUES (${userId}, ${courseId}, NOW(), 'active')
          `;
        }
      }

      return res.status(200).json({ 
        message: `${userIds.length} usuário(s) matriculado(s) com sucesso` 
      });
    } else {
      // Unenroll - Delete enrollments
      for (const userId of userIds) {
        await prisma.$executeRaw`
          DELETE FROM "Enrollment" WHERE "userId" = ${userId} AND "courseId" = ${courseId}
        `;
      }

      return res.status(200).json({ 
        message: `${userIds.length} matrícula(s) removida(s) com sucesso` 
      });
    }
  } catch (error) {
    console.error('Error processing batch enrollment:', error);
    return res.status(500).json({ error: 'Erro ao processar matrículas em lote' });
  }
}
