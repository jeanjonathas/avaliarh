import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { Role, Prisma } from '@prisma/client';

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

  // Obter ID do estudante da URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do estudante inválido' });
  }

  // Processar apenas requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Buscar estudante pelo ID
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        company: true
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Estudante não encontrado' });
    }

    // Verificar se o usuário tem acesso a este estudante
    if (!isAdmin && student.companyId !== companyId) {
      return res.status(403).json({ message: 'Acesso negado a este estudante' });
    }

    // Buscar matrículas do estudante usando SQL direto
    const enrollments: { id: string; studentId: string; courseId: string; enrollmentDate: Date }[] = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM "CourseEnrollment" WHERE "studentId" = ${student.id} ORDER BY "enrollmentDate" DESC`
    );

    // Extrair IDs dos cursos em que o estudante está matriculado
    const enrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);
    
    // Verificar se há cursos matriculados
    const courseFilter = enrolledCourseIds.length > 0 
      ? Prisma.sql`AND "id" NOT IN (${Prisma.join(enrolledCourseIds)})` 
      : Prisma.sql``;
    
    // Buscar cursos disponíveis para matrícula usando SQL direto
    const availableCourses = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM "TrainingCourse" 
      WHERE "companyId" = ${student.companyId} 
      ${courseFilter}`
    );

    // Buscar estatísticas de acesso usando SQL direto
    const accessLogs = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM "TrainingAccessLog" 
      WHERE "studentId" = ${student.id} 
      ORDER BY "accessDate" DESC LIMIT 10`
    );

    // Retornar dados do estudante com cursos disponíveis e estatísticas
    return res.status(200).json({
      student,
      enrollments,
      availableCourses,
      accessLogs
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do estudante:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar detalhes do estudante', 
      error: error.message 
    });
  }
}
