import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';
import { Role, Prisma } from '@prisma/client';
import crypto from 'crypto';

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

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getCourses(req, res, user.companyId);
    case 'POST':
      return createCourse(req, res, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get all courses for the company
async function getCourses(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    // Get all courses for the company
    const courses: {
      id: string;
      name: string;
      description: string;
      sectorId: string | null;
      showResults: boolean;
      finalTestRequired: boolean;
      createdAt: Date;
      updatedAt: Date;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        "sectorId", 
        "showResults", 
        "finalTestRequired", 
        "createdAt", 
        "updatedAt"
      FROM "TrainingCourse"
      WHERE "companyId" = ${companyId}
      ORDER BY "createdAt" DESC
    `;

    // Get sector names for each course
    const sectorIds = courses.filter(c => c.sectorId).map(c => c.sectorId);
    
    const sectors: {
      id: string;
      name: string;
    }[] = sectorIds.length > 0 
      ? await prisma.$queryRaw`
          SELECT id, name
          FROM "TrainingSector"
          WHERE id IN (${Prisma.join(sectorIds as string[])})
        `
      : [];

    // Create a map for quick sector lookup
    const sectorMap = new Map();
    sectors.forEach(sector => {
      sectorMap.set(sector.id, sector.name);
    });

    // Get module counts for each course
    const moduleCounts: {
      courseId: string;
      count: number;
    }[] = courses.length > 0 
      ? await prisma.$queryRaw`
          SELECT 
            "courseId",
            COUNT(*) as count
          FROM "TrainingModule"
          WHERE "courseId" IN (${Prisma.join(courses.map(c => c.id))})
          GROUP BY "courseId"
        `
      : [];

    // Create a map for quick module count lookup
    const moduleCountMap = new Map();
    moduleCounts.forEach(item => {
      moduleCountMap.set(item.courseId, Number(item.count));
    });

    // Get lesson counts for each course
    const lessonCounts: {
      courseId: string;
      count: number;
    }[] = courses.length > 0
      ? await prisma.$queryRaw`
          SELECT 
            m."courseId",
            COUNT(l.id) as count
          FROM "TrainingModule" m
          JOIN "TrainingLesson" l ON l."moduleId" = m.id
          WHERE m."courseId" IN (${Prisma.join(courses.map(c => c.id))})
          GROUP BY m."courseId"
        `
      : [];

    // Create a map for quick lesson count lookup
    const lessonCountMap = new Map();
    lessonCounts.forEach(item => {
      lessonCountMap.set(item.courseId, Number(item.count));
    });

    // Get enrollment data for each course
    const courseIds = courses.map(c => c.id);
    const enrollmentData: {
      courseId: string;
      count: number;
      avgProgress: number;
    }[] = courseIds.length > 0
      ? await prisma.$queryRaw`
          SELECT 
            "courseId",
            COUNT(*) as count,
            COALESCE(AVG(progress), 0) as "avgProgress"
          FROM "CourseEnrollment"
          WHERE "courseId" IN (${Prisma.join(courseIds)})
          GROUP BY "courseId"
        `
      : [];

    // Create a map for quick enrollment data lookup
    const enrollmentDataMap = new Map();
    enrollmentData.forEach(item => {
      enrollmentDataMap.set(item.courseId, {
        count: Number(item.count),
        avgProgress: Number(item.avgProgress)
      });
    });

    // Process courses to include additional stats
    const processedCourses = courses.map(course => {
      // Get enrollment data
      const enrollment = enrollmentDataMap.get(course.id) || { count: 0, avgProgress: 0 };
      
      return {
        id: course.id,
        name: course.name,
        description: course.description,
        sectorId: course.sectorId,
        sectorName: course.sectorId ? sectorMap.get(course.sectorId) || 'Sem setor' : 'Sem setor',
        showResults: course.showResults,
        finalTestRequired: course.finalTestRequired,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        totalModules: moduleCountMap.get(course.id) || 0,
        totalLessons: lessonCountMap.get(course.id) || 0,
        totalStudents: enrollment.count,
        completionRate: Math.round(enrollment.avgProgress)
      };
    });

    return res.status(200).json(processedCourses);
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    return res.status(500).json({ error: 'Erro ao buscar cursos' });
  }
}

// Create a new course
async function createCourse(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { name, description, sectorId, showResults, finalTestRequired, modules } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Nome do curso é obrigatório' });
    }

    // Check if course with the same name already exists
    const existingCourse: { id: string } | null = await prisma.$queryRaw`
      SELECT id 
      FROM "TrainingCourse" 
      WHERE name = ${name} 
      AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (existingCourse) {
      return res.status(400).json({ error: 'Já existe um curso com este nome' });
    }

    // If sectorId is provided, check if it exists
    if (sectorId) {
      const sector: { id: string } | null = await prisma.$queryRaw`
        SELECT id 
        FROM "TrainingSector" 
        WHERE id = ${sectorId} 
        AND "companyId" = ${companyId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (!sector) {
        return res.status(400).json({ error: 'Setor não encontrado' });
      }
    }

    // Validate modules if provided
    if (modules && (!Array.isArray(modules) || modules.length === 0)) {
      return res.status(400).json({ error: 'O curso deve ter pelo menos um módulo' });
    }

    // Start a transaction to create the course, modules, and lessons
    const courseId = crypto.randomUUID();
    await prisma.$transaction(async (prisma) => {
      // Create the course
      await prisma.$executeRaw`
        INSERT INTO "TrainingCourse" (
          id, 
          name, 
          description, 
          "sectorId", 
          "showResults", 
          "finalTestRequired", 
          "companyId", 
          "createdAt", 
          "updatedAt"
        ) 
        VALUES (
          ${courseId}, 
          ${name}, 
          ${description || ''}, 
          ${sectorId || null}, 
          ${showResults || false}, 
          ${finalTestRequired || false}, 
          ${companyId}, 
          ${Prisma.raw('NOW()')}, 
          ${Prisma.raw('NOW()')}
        )
      `;

      // Create modules and lessons if provided
      if (modules && modules.length > 0) {
        for (let i = 0; i < modules.length; i++) {
          const moduleItem = modules[i];
          const moduleId = crypto.randomUUID();
          
          // Create module
          await prisma.$executeRaw`
            INSERT INTO "TrainingModule" (
              id,
              name,
              description,
              "order",
              "courseId",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${moduleId},
              ${moduleItem.name},
              ${moduleItem.description || ''},
              ${moduleItem.order || i + 1},
              ${courseId},
              ${Prisma.raw('NOW()')},
              ${Prisma.raw('NOW()')}
            )
          `;

          // Create lessons for this module if provided
          if (moduleItem.lessons && moduleItem.lessons.length > 0) {
            for (let j = 0; j < moduleItem.lessons.length; j++) {
              const lesson = moduleItem.lessons[j];
              const lessonId = crypto.randomUUID();
              
              // Create lesson
              await prisma.$executeRaw`
                INSERT INTO "TrainingLesson" (
                  id,
                  name,
                  description,
                  type,
                  content,
                  "videoUrl",
                  "slidesUrl",
                  "duration",
                  "order",
                  "moduleId",
                  "createdAt",
                  "updatedAt"
                )
                VALUES (
                  ${lessonId},
                  ${lesson.name},
                  ${lesson.description || ''},
                  ${Prisma.raw(`'${lesson.type || 'TEXT'}'::\"TrainingContentType\"`)},
                  ${lesson.content || ''},
                  ${lesson.videoUrl || null},
                  ${lesson.slidesUrl || null},
                  ${lesson.duration || null},
                  ${lesson.order || j + 1},
                  ${moduleId},
                  ${Prisma.raw('NOW()')},
                  ${Prisma.raw('NOW()')}
                )
              `;
            }
          }
        }
      }

      return courseId;
    });

    // Fetch the created course with modules and lessons
    const course: any = await prisma.$queryRaw`
      SELECT * 
      FROM "TrainingCourse" 
      WHERE id = ${courseId}
    `.then((results: any[]) => results[0]);

    // Fetch modules for this course
    const courseModules: any[] = await prisma.$queryRaw`
      SELECT id, name, description, "order"
      FROM "TrainingModule"
      WHERE "courseId" = ${courseId}
      ORDER BY "order" ASC
    `;

    // Fetch lessons for each module
    for (const moduleItem of courseModules) {
      moduleItem.lessons = await prisma.$queryRaw`
        SELECT id, name, description, type, content, "videoUrl", "slidesUrl", "duration", "order"
        FROM "TrainingLesson"
        WHERE "moduleId" = ${moduleItem.id}
        ORDER BY "order" ASC
      `;
    }

    // Add modules to course
    course.modules = courseModules;

    return res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    return res.status(500).json({ error: 'Erro ao criar curso' });
  }
}
