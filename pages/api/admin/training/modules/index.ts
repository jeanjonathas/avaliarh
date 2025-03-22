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
      return getModules(req, res, user.companyId);
    case 'POST':
      return createModule(req, res, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get all modules for a specific course
async function getModules(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { courseId } = req.query;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ error: 'ID do curso é obrigatório' });
    }

    // Verify if the course belongs to the company
    const course: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingCourse"
      WHERE id = ${courseId} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Get all modules for the course
    const modules: {
      id: string;
      name: string;
      description: string;
      order: number;
      courseId: string;
      finalTestId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        "order", 
        "courseId", 
        "finalTestId", 
        "createdAt", 
        "updatedAt"
      FROM "TrainingModule"
      WHERE "courseId" = ${courseId}
      ORDER BY "order" ASC
    `;

    // Get lessons for each module
    const moduleIds = modules.map(m => m.id);
    const lessons: {
      id: string;
      moduleId: string;
      name: string;
      order: number;
    }[] = moduleIds.length > 0 ? await prisma.$queryRaw`
      SELECT 
        id, 
        "moduleId", 
        name, 
        "order"
      FROM "TrainingLesson"
      WHERE "moduleId" IN (${Prisma.join(moduleIds)})
      ORDER BY "order" ASC
    ` : [];

    // Create a map for quick lesson lookup by moduleId
    const lessonsByModule = new Map();
    lessons.forEach(lesson => {
      if (!lessonsByModule.has(lesson.moduleId)) {
        lessonsByModule.set(lesson.moduleId, []);
      }
      lessonsByModule.get(lesson.moduleId).push(lesson);
    });

    // Get final tests for modules if they exist
    const finalTestIds = modules
      .filter(m => m.finalTestId)
      .map(m => m.finalTestId as string);
    
    const finalTests: {
      id: string;
      title: string;
      description: string;
      passingScore: number;
    }[] = finalTestIds.length > 0 ? await prisma.$queryRaw`
      SELECT 
        id, 
        title, 
        description, 
        "passingScore"
      FROM "TrainingTest"
      WHERE id IN (${Prisma.join(finalTestIds)})
    ` : [];

    // Create a map for quick final test lookup
    const finalTestMap = new Map();
    finalTests.forEach(test => {
      finalTestMap.set(test.id, test);
    });

    // Process modules to include additional stats
    const processedModules = modules.map(module => {
      // Count total lessons
      const totalLessons = lessonsByModule.get(module.id)?.length || 0;
      
      // Check if module has a final test
      const hasFinalTest = !!module.finalTestId;

      // Get the final test if it exists
      const finalTest = module.finalTestId ? finalTestMap.get(module.finalTestId) : null;

      return {
        id: module.id,
        name: module.name,
        description: module.description,
        order: module.order,
        courseId: module.courseId,
        finalTestId: module.finalTestId,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
        lessons: lessonsByModule.get(module.id) || [],
        finalTest,
        totalLessons,
        hasFinalTest
      };
    });

    return res.status(200).json(processedModules);
  } catch (error) {
    console.error('Erro ao buscar módulos:', error);
    return res.status(500).json({ error: 'Erro ao buscar módulos' });
  }
}

// Create a new module
async function createModule(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { name, description, courseId, order, finalTestId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Nome do módulo é obrigatório' });
    }

    if (!courseId) {
      return res.status(400).json({ error: 'ID do curso é obrigatório' });
    }

    // Verify if the course exists and belongs to the company
    const course: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingCourse"
      WHERE id = ${courseId} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Determine the order for the new module
    let moduleOrder = order;
    if (moduleOrder === undefined) {
      // If order is not specified, get the highest order and add 1
      const highestOrder: { maxOrder: number } | null = await prisma.$queryRaw`
        SELECT COALESCE(MAX("order"), 0) as "maxOrder"
        FROM "TrainingModule"
        WHERE "courseId" = ${courseId}
      `.then((results: any[]) => results[0] || { maxOrder: 0 });

      moduleOrder = Number(highestOrder.maxOrder) + 1;
    } else {
      // If order is specified, check if it's valid
      if (typeof moduleOrder !== 'number' || moduleOrder < 1) {
        return res.status(400).json({ error: 'Ordem deve ser um número maior que zero' });
      }

      // If the specified order already exists, shift existing modules
      const existingModulesWithSameOrHigherOrder: { id: string; moduleOrder: number }[] = await prisma.$queryRaw`
        SELECT id, "order" as "moduleOrder"
        FROM "TrainingModule"
        WHERE "courseId" = ${courseId} AND "order" >= ${moduleOrder}
        ORDER BY "order" ASC
      `;

      if (existingModulesWithSameOrHigherOrder.length > 0) {
        // Shift the order of existing modules
        for (const existingModule of existingModulesWithSameOrHigherOrder) {
          await prisma.$executeRaw`
            UPDATE "TrainingModule"
            SET "order" = ${existingModule.moduleOrder + 1}
            WHERE id = ${existingModule.id}
          `;
        }
      }
    }

    // Create the module
    const moduleId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "TrainingModule" (
        id, 
        name, 
        description, 
        "order", 
        "courseId", 
        "finalTestId",
        "createdAt", 
        "updatedAt"
      ) 
      VALUES (
        ${moduleId}, 
        ${name}, 
        ${description || ''}, 
        ${moduleOrder}, 
        ${courseId}, 
        ${finalTestId || null},
        ${Prisma.raw('NOW()')}, 
        ${Prisma.raw('NOW()')}
      )
    `;

    // Fetch the created module
    const createdModule = await prisma.$queryRaw`
      SELECT * 
      FROM "TrainingModule" 
      WHERE id = ${moduleId}
    `.then((results: any[]) => results[0]);

    return res.status(201).json(createdModule);
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    return res.status(500).json({ error: 'Erro ao criar módulo' });
  }
}
