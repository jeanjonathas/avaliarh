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

  // Get course ID from URL
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do curso é obrigatório' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getCourse(req, res, id, user.companyId);
    case 'PUT':
      return updateCourse(req, res, id, user.companyId);
    case 'DELETE':
      return deleteCourse(req, res, id, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get a specific course
async function getCourse(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Get course basic info
    const course: {
      id: string;
      name: string;
      description: string;
      sectorId: string | null;
      showResults: boolean;
      finalTestRequired: boolean;
      finalTestId: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        "sectorId", 
        "showResults", 
        "finalTestRequired",
        "finalTestId",
        "createdAt", 
        "updatedAt"
      FROM "TrainingCourse"
      WHERE id = ${id} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Get sector info if applicable
    let sector = null;
    if (course.sectorId) {
      sector = await prisma.$queryRaw`
        SELECT id, name
        FROM "TrainingSector"
        WHERE id = ${course.sectorId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);
    }

    // Get modules for this course
    const modules: {
      id: string;
      name: string;
      description: string;
      order: number;
      finalTestId: string | null;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description,
        "order",
        "finalTestId"
      FROM "TrainingModule"
      WHERE "courseId" = ${id}
      ORDER BY "order" ASC
    `;

    // Get lessons for each module
    const moduleIds = modules.map(m => m.id);
    const lessons: {
      id: string;
      moduleId: string;
      name: string;
      description: string;
      order: number;
      content: string;
      duration: number;
    }[] = moduleIds.length > 0 ? await prisma.$queryRaw`
      SELECT 
        id,
        "moduleId",
        name,
        description,
        "order",
        content,
        duration
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
    
    const moduleFinalTests: {
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
    moduleFinalTests.forEach(test => {
      finalTestMap.set(test.id, test);
    });

    // Get course final test if it exists
    let courseFinalTest = null;
    if (course.finalTestId) {
      courseFinalTest = await prisma.$queryRaw`
        SELECT 
          id,
          title,
          description,
          "passingScore"
        FROM "TrainingTest"
        WHERE id = ${course.finalTestId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);
    }

    // Get enrollments for this course
    const enrollments: {
      id: string;
      studentId: string;
      progress: number;
      startDate: Date;
      completionDate: Date | null;
    }[] = await prisma.$queryRaw`
      SELECT 
        id,
        "studentId",
        progress,
        "startDate",
        "completionDate"
      FROM "CourseEnrollment"
      WHERE "courseId" = ${id}
    `;

    // Get student info for each enrollment
    const studentIds = enrollments.map(e => e.studentId);
    const students: {
      id: string;
      userId: string;
      name: string;
      email: string;
    }[] = studentIds.length > 0 ? await prisma.$queryRaw`
      SELECT 
        s.id,
        s."userId",
        u.name,
        u.email
      FROM "Student" s
      JOIN "User" u ON s."userId" = u.id
      WHERE s.id IN (${Prisma.join(studentIds)})
    ` : [];

    // Create a map for quick student lookup
    const studentMap = new Map();
    students.forEach(student => {
      studentMap.set(student.id, student);
    });

    // Calculate additional stats
    const totalModules = modules.length;
    const totalLessons = lessons.length;
    const totalStudents = enrollments.length;
    const completionRate = enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) / enrollments.length)
      : 0;

    // Format the response
    const formattedCourse = {
      id: course.id,
      name: course.name,
      description: course.description,
      sectorId: course.sectorId,
      sectorName: sector ? sector.name : 'Sem setor',
      showResults: course.showResults,
      finalTestRequired: course.finalTestRequired,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      modules: modules.map(module => ({
        id: module.id,
        name: module.name,
        description: module.description,
        order: module.order,
        lessons: lessonsByModule.get(module.id) || [],
        finalTest: module.finalTestId ? finalTestMap.get(module.finalTestId) : null
      })),
      enrollments: enrollments.map(enrollment => ({
        id: enrollment.id,
        studentId: enrollment.studentId,
        progress: enrollment.progress,
        startDate: enrollment.startDate,
        completionDate: enrollment.completionDate,
        student: studentMap.get(enrollment.studentId) || null
      })),
      finalTest: courseFinalTest,
      stats: {
        totalModules,
        totalLessons,
        totalStudents,
        completionRate
      }
    };

    return res.status(200).json(formattedCourse);
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    return res.status(500).json({ error: 'Erro ao buscar curso' });
  }
}

// Update a course
async function updateCourse(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    const { name, description, sectorId, showResults, finalTestRequired } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Nome do curso é obrigatório' });
    }

    // Check if course exists and belongs to the company
    const existingCourse: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingCourse"
      WHERE id = ${id} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!existingCourse) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Check if another course with the same name already exists
    const duplicateCourse: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingCourse"
      WHERE name = ${name} AND "companyId" = ${companyId} AND id != ${id}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (duplicateCourse) {
      return res.status(400).json({ error: 'Já existe outro curso com este nome' });
    }

    // If sectorId is provided, check if it exists
    if (sectorId) {
      const sector: { id: string } | null = await prisma.$queryRaw`
        SELECT id
        FROM "TrainingSector"
        WHERE id = ${sectorId} AND "companyId" = ${companyId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (!sector) {
        return res.status(400).json({ error: 'Setor não encontrado' });
      }
    }

    // Update the course
    await prisma.$executeRaw`
      UPDATE "TrainingCourse"
      SET 
        name = ${name},
        description = ${description || ''},
        "sectorId" = ${sectorId || null},
        "showResults" = ${showResults !== undefined ? showResults : true},
        "finalTestRequired" = ${finalTestRequired !== undefined ? finalTestRequired : false},
        "updatedAt" = ${Prisma.raw('NOW()')}
      WHERE id = ${id}
    `;

    // Fetch the updated course
    const updatedCourse = await prisma.$queryRaw`
      SELECT *
      FROM "TrainingCourse"
      WHERE id = ${id}
    `.then((results: any[]) => results[0]);

    return res.status(200).json(updatedCourse);
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    return res.status(500).json({ error: 'Erro ao atualizar curso' });
  }
}

// Delete a course
async function deleteCourse(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Check if course exists and belongs to the company
    const existingCourse: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingCourse"
      WHERE id = ${id} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!existingCourse) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Check if there are enrollments for this course
    const enrollmentCount: { count: number } = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "CourseEnrollment"
      WHERE "courseId" = ${id}
    `.then((results: any[]) => results[0] || { count: 0 });

    if (Number(enrollmentCount.count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir o curso pois existem alunos matriculados' 
      });
    }

    // Delete all modules and lessons associated with this course
    // First get all module IDs
    const moduleIds: { id: string }[] = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingModule"
      WHERE "courseId" = ${id}
    `;

    if (moduleIds.length > 0) {
      const moduleIdList = moduleIds.map(m => m.id);
      
      // Delete lessons from these modules
      await prisma.$executeRaw`
        DELETE FROM "TrainingLesson"
        WHERE "moduleId" IN (${Prisma.join(moduleIdList)})
      `;
      
      // Delete the modules
      await prisma.$executeRaw`
        DELETE FROM "TrainingModule"
        WHERE "courseId" = ${id}
      `;
    }

    // Delete the course
    await prisma.$executeRaw`
      DELETE FROM "TrainingCourse"
      WHERE id = ${id}
    `;

    return res.status(200).json({ message: 'Curso excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir curso:', error);
    return res.status(500).json({ error: 'Erro ao excluir curso' });
  }
}
