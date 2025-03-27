import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
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
  // Garantir que a conexão com o banco de dados esteja ativa
  await reconnectPrisma();
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

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getLessons(req, res, user.companyId);
    case 'POST':
      return createLesson(req, res, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get all lessons for a specific module
async function getLessons(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { moduleId } = req.query;

    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'ID do módulo é obrigatório' });
    }

    // Verify if the module exists and belongs to the company
    try {
      // Check if module exists and belongs to the company
      const moduleData: { id: string } | null = await prisma.$queryRaw`
        SELECT tm.id
        FROM "TrainingModule" tm
        JOIN "TrainingCourse" tc ON tm."courseId" = tc.id
        WHERE tm.id = ${moduleId}
        AND tc."companyId" = ${companyId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (!moduleData) {
        return res.status(404).json({ error: 'Módulo não encontrado ou não pertence à empresa' });
      }

      // Get all lessons for the module
      const lessons: {
        id: string;
        name: string;
        description: string;
        order: number;
        moduleId: string;
        type: string;
        content: string;
        duration: number;
        finalTestId: string | null;
      }[] = await prisma.$queryRaw`
        SELECT 
          tl.id, 
          tl.name, 
          tl.description, 
          tl.order, 
          tl."moduleId", 
          tl.type, 
          tl.content, 
          tl.duration, 
          tl."finalTestId"
        FROM "TrainingLesson" tl
        WHERE tl."moduleId" = ${moduleId}
        ORDER BY tl.order ASC
      `;

      // Get progress data for each lesson
      const progressData: {
        lessonId: string;
        total: number;
        completed: number;
      }[] = await prisma.$queryRaw`
        SELECT 
          lp."lessonId",
          COUNT(*) as total,
          SUM(CASE WHEN lp.completed THEN 1 ELSE 0 END) as completed
        FROM "LessonProgress" lp
        WHERE lp."lessonId" IN (${Prisma.join(lessons.map(l => l.id))})
        GROUP BY lp."lessonId"
      `;

      // Create a map for quick lookup
      const progressMap = new Map();
      progressData.forEach(item => {
        progressMap.set(item.lessonId, {
          total: Number(item.total),
          completed: Number(item.completed)
        });
      });

      // Process lessons to include additional stats
      const processedLessons = lessons.map(lesson => {
        const progress = progressMap.get(lesson.id) || { total: 0, completed: 0 };
        
        // Check if lesson has a final test
        const hasFinalTest = !!lesson.finalTestId;
        
        // Calculate completion rate
        const completionRate = progress.total > 0
          ? Math.round(progress.completed / progress.total * 100)
          : 0;

        return {
          id: lesson.id,
          name: lesson.name,
          description: lesson.description,
          order: lesson.order,
          moduleId: lesson.moduleId,
          type: lesson.type,
          content: lesson.content,
          duration: lesson.duration,
          hasFinalTest,
          stats: {
            totalProgress: progress.total,
            completionRate
          }
        };
      });

      return res.status(200).json(processedLessons);
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      return res.status(500).json({ error: 'Erro ao verificar o módulo' });
    }
  } catch (error) {
    console.error('Erro ao buscar lições:', error);
    return res.status(500).json({ error: 'Erro ao buscar lições' });
  }
}

// Create a new lesson
async function createLesson(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { 
      name, 
      description, 
      order, 
      moduleId, 
      type, 
      content, 
      duration,
      finalTestId 
    } = req.body;

    if (!name || !moduleId || !type || !content) {
      return res.status(400).json({ error: 'Dados incompletos para criar a Aula' });
    }

    // Verify if the module exists and belongs to the company
    const moduleData: { id: string } | null = await prisma.$queryRaw`
      SELECT tm.id
      FROM "TrainingModule" tm
      JOIN "TrainingCourse" tc ON tm."courseId" = tc.id
      WHERE tm.id = ${moduleId}
      AND tc."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!moduleData) {
      return res.status(404).json({ error: 'Módulo não encontrado ou não pertence à empresa' });
    }

    // Create the lesson
    const newLesson = await prisma.$executeRaw`
      INSERT INTO "TrainingLesson" (
        id, 
        name, 
        description, 
        "order", 
        "moduleId", 
        type, 
        content, 
        duration, 
        "finalTestId", 
        "createdAt", 
        "updatedAt"
      ) 
      VALUES (
        ${Prisma.raw(`'${Prisma.raw(crypto.randomUUID())}'`)}, 
        ${name}, 
        ${description || ''}, 
        ${order || 0}, 
        ${moduleId}, 
        ${type}, 
        ${content}, 
        ${duration || 0}, 
        ${finalTestId || null}, 
        ${Prisma.raw('NOW()')}, 
        ${Prisma.raw('NOW()')}
      )
      RETURNING *
    `;

    // Fetch the created lesson
    const lesson = await prisma.$queryRaw`
      SELECT * FROM "TrainingLesson" 
      WHERE "moduleId" = ${moduleId} 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `.then((results: any[]) => results[0]);

    return res.status(201).json(lesson);
  } catch (error) {
    console.error('Erro ao criar Aula:', error);
    return res.status(500).json({ error: 'Erro ao criar Aula' });
  }
}
