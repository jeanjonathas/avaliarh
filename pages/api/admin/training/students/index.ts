import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';

// Schema para validação dos parâmetros de query
const querySchema = z.object({
  companyId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Verificar se o usuário é um administrador ou pertence à empresa
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: true },
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

  // Tratar diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getStudents(req, res, isAdmin, companyId);
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// Função para listar estudantes
async function getStudents(
  req: NextApiRequest,
  res: NextApiResponse,
  isAdmin: boolean,
  userCompanyId: string | null
) {
  try {
    // Validar e extrair parâmetros de query
    const queryResult = querySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ message: 'Parâmetros inválidos', errors: queryResult.error.format() });
    }

    const { companyId, search, page = 1, limit = 10 } = queryResult.data;

    // Verificar se o usuário tem acesso à empresa solicitada
    if (companyId && !isAdmin && companyId !== userCompanyId) {
      return res.status(403).json({ message: 'Acesso negado a esta empresa' });
    }

    // Definir o ID da empresa a ser usado na consulta
    const targetCompanyId = companyId || userCompanyId;

    // Calcular paginação
    const skip = (page - 1) * limit;

    // Construir a consulta para buscar estudantes
    let studentsQuery = `
      SELECT 
        s.id, 
        s."userId", 
        s."enrollmentDate", 
        s.progress, 
        u.id as "user_id", 
        u.name as "user_name", 
        u.email as "user_email", 
        u.role as "user_role"
      FROM "Student" s
      JOIN "User" u ON s."userId" = u.id
      WHERE u."companyId" = $1
    `;

    const queryParams: any[] = [targetCompanyId];
    let countQuery = `
      SELECT COUNT(*) as total
      FROM "Student" s
      JOIN "User" u ON s."userId" = u.id
      WHERE u."companyId" = $1
    `;

    // Adicionar condição de busca se fornecida
    if (search) {
      studentsQuery += ` AND (u.name ILIKE $2 OR u.email ILIKE $2)`;
      countQuery += ` AND (u.name ILIKE $2 OR u.email ILIKE $2)`;
      queryParams.push(`%${search}%`);
    }

    // Adicionar ordenação e paginação
    studentsQuery += ` ORDER BY u.name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, skip);

    // Executar consulta para buscar estudantes
    const studentsResult = await prisma.$queryRawUnsafe(studentsQuery, ...queryParams);
    
    // Executar consulta para contar total de registros
    const countResult: { total: BigInt }[] = await prisma.$queryRawUnsafe(countQuery, ...queryParams.slice(0, search ? 2 : 1));
    const totalStudents = Number(countResult[0].total);

    // Buscar matrículas de cursos para cada estudante
    const studentIds = (studentsResult as any[]).map((s: any) => s.id);
    
    const enrollments: {
      id: string;
      studentId: string;
      courseId: string;
      enrollmentDate: Date;
      completionDate: Date | null;
      progress: number;
      courseName: string;
    }[] = studentIds.length > 0 ? await prisma.$queryRaw`
      SELECT 
        ce.id, 
        ce."studentId", 
        ce."courseId", 
        ce."enrollmentDate", 
        ce."completionDate", 
        ce.progress,
        c.name as "courseName"
      FROM "CourseEnrollment" ce
      JOIN "TrainingCourse" c ON ce."courseId" = c.id
      WHERE ce."studentId" IN (${Prisma.join(studentIds)})
    ` : [];

    // Criar um mapa de matrículas por estudante
    const enrollmentsByStudent = new Map();
    enrollments.forEach(enrollment => {
      if (!enrollmentsByStudent.has(enrollment.studentId)) {
        enrollmentsByStudent.set(enrollment.studentId, []);
      }
      
      enrollmentsByStudent.get(enrollment.studentId).push({
        id: enrollment.id,
        courseId: enrollment.courseId,
        enrollmentDate: enrollment.enrollmentDate,
        completionDate: enrollment.completionDate,
        progress: enrollment.progress,
        course: {
          id: enrollment.courseId,
          name: enrollment.courseName
        }
      });
    });

    // Formatar os resultados
    const formattedStudents = (studentsResult as any[]).map((student: any) => ({
      id: student.id,
      userId: student.userId,
      enrollmentDate: student.enrollmentDate,
      progress: student.progress,
      user: {
        id: student.user_id,
        name: student.user_name,
        email: student.user_email,
        role: student.user_role
      },
      courseEnrollments: enrollmentsByStudent.get(student.id) || []
    }));

    // Retornar dados com metadados de paginação
    return res.status(200).json({
      data: formattedStudents,
      pagination: {
        total: totalStudents,
        page,
        limit,
        totalPages: Math.ceil(totalStudents / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estudantes:', error);
    return res.status(500).json({ message: 'Erro ao buscar estudantes' });
  }
}
