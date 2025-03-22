import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Role, Prisma } from '@prisma/client';

// Schema para validação do corpo da requisição
const enrollmentSchema = z.object({
  courseId: z.string().uuid(),
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

  // Obter ID do estudante da URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do estudante inválido' });
  }

  // Processar apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Validar corpo da requisição
    const { courseId } = enrollmentSchema.parse(req.body);

    // Verificar se o estudante existe
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ message: 'Estudante não encontrado' });
    }

    // Verificar se o usuário tem acesso a este estudante
    if (!isAdmin && student.user.companyId !== companyId) {
      return res.status(403).json({ message: 'Acesso negado a este estudante' });
    }

    // Verificar se o curso existe e pertence à mesma empresa
    const course: { id: string; companyId: string } | null = await prisma.$queryRaw(
      Prisma.sql`SELECT id, "companyId" FROM "TrainingCourse" WHERE id = ${courseId} LIMIT 1`
    ).then((results: any[]) => results[0] || null);

    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    if (course.companyId !== student.user.companyId) {
      return res.status(403).json({ message: 'O curso não pertence à mesma empresa do estudante' });
    }

    // Verificar se o estudante já está matriculado neste curso
    const existingEnrollment: { id: string } | null = await prisma.$queryRaw(
      Prisma.sql`SELECT id FROM "CourseEnrollment" WHERE "studentId" = ${id} AND "courseId" = ${courseId} LIMIT 1`
    ).then((results: any[]) => results[0] || null);

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Estudante já está matriculado neste curso' });
    }

    // Criar nova matrícula
    const enrollment = await prisma.$executeRaw(
      Prisma.sql`INSERT INTO "CourseEnrollment" ("id", "studentId", "courseId", "enrollmentDate", "progress") 
      VALUES (${Prisma.join([
        Prisma.raw(`'${Prisma.raw(crypto.randomUUID())}'`), 
        id, 
        courseId, 
        Prisma.raw('NOW()'), 
        0
      ])}) RETURNING *`
    );

    // Registrar acesso inicial
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO "TrainingAccessLog" ("id", "studentId", "courseId", "accessDate", "timeSpent") 
      VALUES (${Prisma.join([
        Prisma.raw(`'${Prisma.raw(crypto.randomUUID())}'`), 
        id, 
        courseId, 
        Prisma.raw('NOW()'), 
        0
      ])})`
    );

    return res.status(201).json({
      message: 'Estudante matriculado com sucesso',
      enrollment
    });
  } catch (error) {
    console.error('Erro ao matricular estudante:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      message: 'Erro ao matricular estudante', 
      error: error.message 
    });
  }
}
