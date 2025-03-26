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

  // Extract module ID from query
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do módulo é obrigatório' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getModule(req, res, id, user.companyId);
    case 'PUT':
      return updateModule(req, res, id, user.companyId);
    case 'DELETE':
      return deleteModule(req, res, id, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get a specific module
async function getModule(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Verify if the module exists and belongs to a course from the company
    const moduleWithCourse: {
      id: string;
      name: string;
      description: string;
      order: number;
      courseId: string;
      finalTestId: string | null;
      courseName: string;
      courseDescription: string;
    } | null = await prisma.$queryRaw`
      SELECT 
        m.id, 
        m.name, 
        m.description, 
        m."order", 
        m."courseId", 
        m."finalTestId",
        c.name as "courseName",
        c.description as "courseDescription"
      FROM "TrainingModule" m
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE m.id = ${id} AND c."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!moduleWithCourse) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    // Get lessons for the module
    const lessons: {
      id: string;
      name: string;
      description: string;
      content: string;
      order: number;
      moduleId: string;
      createdAt: Date;
      updatedAt: Date;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        content, 
        "order", 
        "moduleId", 
        "createdAt", 
        "updatedAt"
      FROM "TrainingLesson"
      WHERE "moduleId" = ${id}
      ORDER BY "order" ASC
    `;

    // Get final test if it exists
    let finalTest = null;
    if (moduleWithCourse.finalTestId) {
      const testData: {
        id: string;
        title: string;
        description: string;
        passingScore: number;
        createdAt: Date;
        updatedAt: Date;
      } | null = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "passingScore", 
          "createdAt", 
          "updatedAt"
        FROM "TrainingTest"
        WHERE id = ${moduleWithCourse.finalTestId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (testData) {
        // Get questions for the test
        const questions: {
          id: string;
          testId: string;
          text: string;
          order: number;
        }[] = await prisma.$queryRaw`
          SELECT 
            id, 
            "testId", 
            text, 
            "order"
          FROM "TrainingQuestion"
          WHERE "testId" = ${testData.id}
          ORDER BY "order" ASC
        `;

        // Get options for each question
        const questionIds = questions.map(q => q.id);
        const options: {
          id: string;
          questionId: string;
          text: string;
          isCorrect: boolean;
          order: number;
        }[] = questionIds.length > 0 ? await prisma.$queryRaw`
          SELECT 
            id, 
            "questionId", 
            text, 
            "isCorrect", 
            "order"
          FROM "TrainingQuestionOption"
          WHERE "questionId" IN (${Prisma.join(questionIds)})
          ORDER BY "order" ASC
        ` : [];

        // Create a map for quick option lookup by questionId
        const optionsByQuestion = new Map();
        options.forEach(option => {
          if (!optionsByQuestion.has(option.questionId)) {
            optionsByQuestion.set(option.questionId, []);
          }
          optionsByQuestion.get(option.questionId).push(option);
        });

        // Add options to each question
        const questionsWithOptions = questions.map(question => ({
          ...question,
          options: optionsByQuestion.get(question.id) || []
        }));

        finalTest = {
          ...testData,
          questions: questionsWithOptions
        };
      }
    }

    // Calculate additional stats
    const totalLessons = lessons.length;
    const hasFinalTest = !!moduleWithCourse.finalTestId;

    // Format the response
    const formattedModule = {
      id: moduleWithCourse.id,
      name: moduleWithCourse.name,
      description: moduleWithCourse.description,
      order: moduleWithCourse.order,
      courseId: moduleWithCourse.courseId,
      finalTestId: moduleWithCourse.finalTestId,
      course: {
        id: moduleWithCourse.courseId,
        name: moduleWithCourse.courseName,
        description: moduleWithCourse.courseDescription
      },
      lessons,
      finalTest,
      totalLessons,
      hasFinalTest
    };

    return res.status(200).json(formattedModule);
  } catch (error) {
    console.error('Erro ao buscar módulo:', error);
    return res.status(500).json({ error: 'Erro ao buscar módulo' });
  }
}

// Update a module
async function updateModule(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    const { name, description, order, finalTestId } = req.body;

    // Verify if the module exists and belongs to a course from the company
    const moduleExists: { id: string; courseId: string } | null = await prisma.$queryRaw`
      SELECT m.id, m."courseId"
      FROM "TrainingModule" m
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE m.id = ${id} AND c."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!moduleExists) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    // If finalTestId is provided, verify if it exists and belongs to the company
    if (finalTestId) {
      const testExists: { id: string } | null = await prisma.$queryRaw`
        SELECT t.id
        FROM "TrainingTest" t
        JOIN "TrainingCourse" c ON t."courseId" = c.id
        WHERE t.id = ${finalTestId} AND c."companyId" = ${companyId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (!testExists) {
        return res.status(404).json({ error: 'Teste final não encontrado' });
      }
    }

    // If order is changed, handle reordering of other modules
    if (order !== undefined) {
      // Get current order of the module
      const currentModule: { currentOrder: number } | null = await prisma.$queryRaw`
        SELECT "order" as "currentOrder"
        FROM "TrainingModule"
        WHERE id = ${id}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (currentModule && currentModule.currentOrder !== order) {
        // If moving up in order (e.g., from 3 to 1)
        if (order < currentModule.currentOrder) {
          await prisma.$executeRaw`
            UPDATE "TrainingModule"
            SET "order" = "order" + 1
            WHERE "courseId" = ${moduleExists.courseId}
              AND "order" >= ${order}
              AND "order" < ${currentModule.currentOrder}
              AND id != ${id}
          `;
        } 
        // If moving down in order (e.g., from 1 to 3)
        else if (order > currentModule.currentOrder) {
          await prisma.$executeRaw`
            UPDATE "TrainingModule"
            SET "order" = "order" - 1
            WHERE "courseId" = ${moduleExists.courseId}
              AND "order" <= ${order}
              AND "order" > ${currentModule.currentOrder}
              AND id != ${id}
          `;
        }
      }
    }

    // Create an update data object with only the fields that are provided
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (description !== undefined) {
      updateData.description = description;
    }
    
    if (order !== undefined) {
      updateData.order = order;
    }
    
    if (finalTestId !== undefined) {
      updateData.finalTestId = finalTestId || null; // Handle null case
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido' });
    }
    
    // Build the SET clause for the SQL query
    const setClauses = [];
    
    if (updateData.name !== undefined) {
      setClauses.push(`name = ${Prisma.sql`${updateData.name}`}`);
    }
    
    if (updateData.description !== undefined) {
      setClauses.push(`description = ${Prisma.sql`${updateData.description}`}`);
    }
    
    if (updateData.order !== undefined) {
      setClauses.push(`"order" = ${updateData.order}`);
    }
    
    if (updateData.finalTestId !== undefined) {
      setClauses.push(`"finalTestId" = ${updateData.finalTestId === null ? Prisma.sql`NULL` : Prisma.sql`${updateData.finalTestId}`}`);
    }
    
    // Add updated timestamp
    setClauses.push(`"updatedAt" = ${Prisma.raw('NOW()')}`);
    
    // Execute the update
    await prisma.$executeRaw`
      UPDATE "TrainingModule"
      SET ${Prisma.raw(setClauses.join(', '))}
      WHERE id = ${id}
    `;
    
    // Fetch the updated module
    const updatedModule = await prisma.$queryRaw`
      SELECT * FROM "TrainingModule" WHERE id = ${id}
    `.then((results: any[]) => results[0] || null);

    return res.status(200).json(updatedModule);
  } catch (error) {
    console.error('Erro ao atualizar módulo:', error);
    return res.status(500).json({ error: 'Erro ao atualizar módulo' });
  }
}

// Delete a module
async function deleteModule(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Verify if the module exists and belongs to a course from the company
    const moduleExists: { id: string; courseId: string; moduleOrder: number } | null = await prisma.$queryRaw`
      SELECT m.id, m."courseId", m."order" as "moduleOrder"
      FROM "TrainingModule" m
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE m.id = ${id} AND c."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!moduleExists) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    // Check if there are any lessons in this module
    const lessonsCount: { count: number } | null = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "TrainingLesson"
      WHERE "moduleId" = ${id}
    `.then((results: any[]) => results[0] || null);

    if (lessonsCount && lessonsCount.count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um módulo que contém lições. Remova as lições primeiro.' 
      });
    }

    // Delete the module
    await prisma.$executeRaw`
      DELETE FROM "TrainingModule"
      WHERE id = ${id}
    `;

    // Reorder remaining modules
    await prisma.$executeRaw`
      UPDATE "TrainingModule"
      SET "order" = "order" - 1
      WHERE "courseId" = ${moduleExists.courseId}
        AND "order" > ${moduleExists.moduleOrder}
    `;

    return res.status(200).json({ message: 'Módulo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir módulo:', error);
    return res.status(500).json({ error: 'Erro ao excluir módulo' });
  }
}
