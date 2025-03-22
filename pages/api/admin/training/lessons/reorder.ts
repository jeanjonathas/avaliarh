import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';
import { Role, Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Get user info from session
  const userEmail = session.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: 'Usuário não identificado' });
  }

  // Get user from database to check role and company
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  if (!user.companyId) {
    return res.status(403).json({ error: 'Usuário não está associado a uma empresa' });
  }

  // Check if user has admin role
  if (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.INSTRUCTOR) {
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Get request body
  const { moduleId, lessons } = req.body;

  if (!moduleId || !lessons || !Array.isArray(lessons) || lessons.length === 0) {
    return res.status(400).json({ error: 'Dados inválidos para reordenação de lições' });
  }

  try {
    // Verify that the module belongs to the user's company
    const moduleData = await prisma.$queryRaw`
      SELECT m.id
      FROM "TrainingModule" m
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE m.id = ${moduleId}
      AND c."companyId" = ${user.companyId}
    `;

    if (!Array.isArray(moduleData) || moduleData.length === 0) {
      return res.status(404).json({ error: 'Módulo não encontrado ou não pertence à sua empresa' });
    }

    // Get all lesson IDs from the module to verify that all lessons in the request belong to this module
    const lessonIds = await prisma.$queryRaw`
      SELECT id FROM "TrainingLesson"
      WHERE "moduleId" = ${moduleId}
    `;

    const validLessonIds = (lessonIds as { id: string }[]).map(l => l.id);
    const requestLessonIds = lessons.map(l => l.id);

    // Check if all lessons in the request belong to the module
    const allLessonsValid = requestLessonIds.every(id => validLessonIds.includes(id));
    if (!allLessonsValid) {
      return res.status(400).json({ error: 'Uma ou mais lições não pertencem ao módulo especificado' });
    }

    // Update the order of all lessons in a transaction
    await prisma.$transaction(
      lessons.map(lesson => 
        prisma.$executeRaw`
          UPDATE "TrainingLesson"
          SET "order" = ${lesson.order}
          WHERE id = ${lesson.id}
        `
      )
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao reordenar lições:', error);
    return res.status(500).json({ error: 'Erro ao reordenar lições' });
  }
}
