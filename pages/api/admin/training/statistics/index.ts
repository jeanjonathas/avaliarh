import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Role, Prisma } from '@prisma/client';

// Schema para validação dos parâmetros de query
const querySchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  courseId: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Obter usuário do banco de dados
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  // Verificar se o usuário é um administrador ou pertence à empresa
  const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.COMPANY_ADMIN;
  const companyId = user.companyId;

  if (!isAdmin && !companyId) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  // Processar apenas requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Validar e processar parâmetros de query
    const { startDate, endDate, courseId } = querySchema.parse(req.query);

    // Construir filtros para a consulta SQL
    const courseFilterSql = courseId 
      ? Prisma.sql`AND tc.id = ${courseId}` 
      : Prisma.sql``;

    let dateFilterSql;
    if (startDate && endDate) {
      dateFilterSql = Prisma.sql`AND ce."enrollmentDate" BETWEEN ${startDate} AND ${endDate}`;
    } else if (startDate) {
      dateFilterSql = Prisma.sql`AND ce."enrollmentDate" >= ${startDate}`;
    } else if (endDate) {
      dateFilterSql = Prisma.sql`AND ce."enrollmentDate" <= ${endDate}`;
    } else {
      dateFilterSql = Prisma.sql``;
    }

    // Estatísticas de cursos
    const courses = await prisma.$queryRaw`
      SELECT 
        tc.id, 
        tc.name, 
        tc.description,
        COUNT(ce.id) as enrollment_count
      FROM "TrainingCourse" tc
      LEFT JOIN "CourseEnrollment" ce ON tc.id = ce."courseId"
      WHERE tc."companyId" = ${companyId}
      ${courseFilterSql}
      GROUP BY tc.id, tc.name, tc.description
      ORDER BY tc.name
    `;

    // Estatísticas de matrículas por curso
    const enrollmentStats = await prisma.$queryRaw`
      SELECT 
        ce."courseId",
        COUNT(*) as count,
        AVG(ce.progress) as avg_progress
      FROM "CourseEnrollment" ce
      JOIN "TrainingCourse" tc ON ce."courseId" = tc.id
      WHERE tc."companyId" = ${companyId}
      ${dateFilterSql}
      ${courseFilterSql}
      GROUP BY ce."courseId"
    `;

    // Estatísticas de acesso
    const accessStats = await prisma.$queryRaw`
      SELECT 
        tal."courseId",
        COUNT(*) as access_count,
        SUM(tal."timeSpent") as total_time_spent
      FROM "TrainingAccessLog" tal
      JOIN "TrainingCourse" tc ON tal."courseId" = tc.id
      WHERE tc."companyId" = ${companyId}
      ${courseFilterSql}
      GROUP BY tal."courseId"
    `;

    // Estatísticas de progresso dos estudantes
    const studentProgress = await prisma.$queryRaw`
      SELECT 
        s.id,
        s."userId",
        u.name,
        AVG(ce.progress) as avg_progress,
        COUNT(DISTINCT ce."courseId") as enrolled_courses
      FROM "Student" s
      JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "CourseEnrollment" ce ON s.id = ce."studentId"
      LEFT JOIN "TrainingCourse" tc ON ce."courseId" = tc.id
      WHERE tc."companyId" = ${companyId}
      ${courseFilterSql}
      GROUP BY s.id, s."userId", u.name
      ORDER BY avg_progress DESC
      LIMIT 10
    `;

    return res.status(200).json({
      courses,
      enrollmentStats,
      accessStats,
      studentProgress,
      filters: {
        startDate,
        endDate,
        courseId
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de treinamento:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Parâmetros de consulta inválidos', 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      message: 'Erro ao buscar estatísticas de treinamento', 
      error: error.message 
    });
  }
}
