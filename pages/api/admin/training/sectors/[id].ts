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

  // Extract sector ID from query
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do setor é obrigatório' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getSector(req, res, id, user.companyId);
    case 'PUT':
      return updateSector(req, res, id, user.companyId);
    case 'DELETE':
      return deleteSector(req, res, id, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get a specific sector
async function getSector(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Find the sector and verify it belongs to the company
    const sector: {
      id: string;
      name: string;
      description: string;
      companyId: string;
      createdAt: Date;
      updatedAt: Date;
    } | null = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        "companyId", 
        "createdAt", 
        "updatedAt"
      FROM "TrainingSector"
      WHERE id = ${id} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!sector) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    // Get courses for this sector
    const courses: {
      id: string;
      name: string;
      description: string;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description
      FROM "TrainingCourse"
      WHERE "sectorId" = ${id}
      ORDER BY name ASC
    `;

    // Get module counts for each course
    const moduleCounts: {
      courseId: string;
      count: number;
    }[] = await prisma.$queryRaw`
      SELECT 
        "courseId",
        COUNT(*) as count
      FROM "TrainingModule"
      WHERE "courseId" IN (${Prisma.join(courses.map(c => c.id))})
      GROUP BY "courseId"
    `;

    // Create a map for quick module count lookup
    const moduleCountMap = new Map();
    moduleCounts.forEach(item => {
      moduleCountMap.set(item.courseId, Number(item.count));
    });

    // Get lesson counts for each course
    const lessonCounts: {
      courseId: string;
      count: number;
    }[] = await prisma.$queryRaw`
      SELECT 
        tc.id as "courseId",
        COUNT(tl.id) as count
      FROM "TrainingCourse" tc
      JOIN "TrainingModule" tm ON tc.id = tm."courseId"
      JOIN "TrainingLesson" tl ON tm.id = tl."moduleId"
      WHERE tc."sectorId" = ${id}
      GROUP BY tc.id
    `;

    // Create a map for quick lesson count lookup
    const lessonCountMap = new Map();
    lessonCounts.forEach(item => {
      lessonCountMap.set(item.courseId, Number(item.count));
    });

    // Get enrollment counts for each course
    const enrollmentCounts: {
      courseId: string;
      count: number;
      uniqueStudents: number;
    }[] = await prisma.$queryRaw`
      SELECT 
        "courseId",
        COUNT(*) as count,
        COUNT(DISTINCT "studentId") as "uniqueStudents"
      FROM "CourseEnrollment"
      WHERE "courseId" IN (${Prisma.join(courses.map(c => c.id))})
      GROUP BY "courseId"
    `;

    // Create a map for quick enrollment count lookup
    const enrollmentCountMap = new Map();
    enrollmentCounts.forEach(item => {
      enrollmentCountMap.set(item.courseId, {
        count: Number(item.count),
        uniqueStudents: Number(item.uniqueStudents)
      });
    });

    // Get total unique students across all courses in this sector
    const totalStudentsResult: { count: number } | null = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT ce."studentId") as count
      FROM "CourseEnrollment" ce
      JOIN "TrainingCourse" tc ON ce."courseId" = tc.id
      WHERE tc."sectorId" = ${id}
    `.then((results: any[]) => results[0] || { count: 0 });

    const totalStudents = Number(totalStudentsResult.count);

    // Calculate additional stats
    const totalCourses = courses.length;
    const totalModules = moduleCounts.reduce((sum, item) => sum + Number(item.count), 0);
    const totalLessons = lessonCounts.reduce((sum, item) => sum + Number(item.count), 0);

    // Format the response
    const formattedSector = {
      id: sector.id,
      name: sector.name,
      description: sector.description,
      companyId: sector.companyId,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt,
      courses: courses.map(course => ({
        id: course.id,
        name: course.name,
        description: course.description,
        moduleCount: moduleCountMap.get(course.id) || 0,
        lessonCount: lessonCountMap.get(course.id) || 0,
        enrollmentCount: enrollmentCountMap.get(course.id)?.count || 0,
        studentCount: enrollmentCountMap.get(course.id)?.uniqueStudents || 0
      })),
      stats: {
        totalCourses,
        totalModules,
        totalLessons,
        totalStudents
      }
    };

    return res.status(200).json(formattedSector);
  } catch (error) {
    console.error('Erro ao buscar setor:', error);
    return res.status(500).json({ error: 'Erro ao buscar setor' });
  }
}

// Update a sector
async function updateSector(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Nome do setor é obrigatório' });
    }

    // Check if sector exists and belongs to the company
    const existingSector: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingSector"
      WHERE id = ${id} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!existingSector) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    // Check if another sector with the same name already exists
    const duplicateSector: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingSector"
      WHERE name = ${name} AND "companyId" = ${companyId} AND id != ${id}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (duplicateSector) {
      return res.status(400).json({ error: 'Já existe outro setor com este nome' });
    }

    // Update the sector
    await prisma.$executeRaw`
      UPDATE "TrainingSector"
      SET 
        name = ${name},
        description = ${description || ''},
        "updatedAt" = ${Prisma.raw('NOW()')}
      WHERE id = ${id}
    `;

    // Fetch the updated sector
    const updatedSector = await prisma.$queryRaw`
      SELECT *
      FROM "TrainingSector"
      WHERE id = ${id}
    `.then((results: any[]) => results[0]);

    return res.status(200).json(updatedSector);
  } catch (error) {
    console.error('Erro ao atualizar setor:', error);
    return res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
}

// Delete a sector
async function deleteSector(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Check if sector exists and belongs to the company
    const existingSector: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingSector"
      WHERE id = ${id} AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!existingSector) {
      return res.status(404).json({ error: 'Setor não encontrado' });
    }

    // Check if there are courses associated with this sector
    const courseCount: { count: number } = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "TrainingCourse"
      WHERE "sectorId" = ${id}
    `.then((results: any[]) => results[0] || { count: 0 });

    if (Number(courseCount.count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir o setor pois existem cursos associados a ele' 
      });
    }

    // Delete the sector
    await prisma.$executeRaw`
      DELETE FROM "TrainingSector"
      WHERE id = ${id}
    `;

    return res.status(200).json({ message: 'Setor excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir setor:', error);
    return res.status(500).json({ error: 'Erro ao excluir setor' });
  }
}
