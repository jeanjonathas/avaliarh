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

  // Extract lesson ID from query
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID da lição é obrigatório' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getLesson(req, res, id, user.companyId);
    case 'PUT':
      return updateLesson(req, res, id, user.companyId);
    case 'DELETE':
      return deleteLesson(req, res, id, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get a specific lesson
async function getLesson(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Find the lesson and verify it belongs to a module from a course from the company
    const lessonWithDetails: {
      id: string;
      name: string;
      description: string;
      content: string;
      order: number;
      moduleId: string;
      finalTestId: string | null;
      createdAt: Date;
      updatedAt: Date;
      moduleName: string;
      courseId: string;
      courseName: string;
    } | null = await prisma.$queryRaw`
      SELECT 
        l.id, 
        l.name, 
        l.description, 
        l.content, 
        l."order", 
        l."moduleId", 
        l."finalTestId", 
        l."createdAt", 
        l."updatedAt",
        m.name as "moduleName",
        c.id as "courseId",
        c.name as "courseName"
      FROM "TrainingLesson" l
      JOIN "TrainingModule" m ON l."moduleId" = m.id
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE l.id = ${id} AND c."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!lessonWithDetails) {
      return res.status(404).json({ error: 'Lição não encontrada' });
    }

    // Get final test if it exists
    let finalTest = null;
    if (lessonWithDetails.finalTestId) {
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
        WHERE id = ${lessonWithDetails.finalTestId}
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

    // Get progress data for the lesson
    const progress: {
      id: string;
      lessonId: string;
      studentId: string;
      completed: boolean;
      completedAt: Date | null;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        "lessonId", 
        "studentId", 
        completed, 
        "completedAt"
      FROM "LessonProgress"
      WHERE "lessonId" = ${id}
    `;

    // Calculate additional stats
    const hasFinalTest = !!lessonWithDetails.finalTestId;
    const totalProgress = progress.length;
    const completionRate = progress.length > 0
      ? Math.round(progress.filter(p => p.completed).length / progress.length * 100)
      : 0;

    // Format the response
    const formattedLesson = {
      id: lessonWithDetails.id,
      name: lessonWithDetails.name,
      description: lessonWithDetails.description,
      content: lessonWithDetails.content,
      order: lessonWithDetails.order,
      moduleId: lessonWithDetails.moduleId,
      finalTestId: lessonWithDetails.finalTestId,
      createdAt: lessonWithDetails.createdAt,
      updatedAt: lessonWithDetails.updatedAt,
      module: {
        id: lessonWithDetails.moduleId,
        name: lessonWithDetails.moduleName,
        course: {
          id: lessonWithDetails.courseId,
          name: lessonWithDetails.courseName
        }
      },
      finalTest,
      progress,
      hasFinalTest,
      totalProgress,
      completionRate
    };

    return res.status(200).json(formattedLesson);
  } catch (error) {
    console.error('Erro ao buscar lição:', error);
    return res.status(500).json({ error: 'Erro ao buscar lição' });
  }
}

// Update a lesson
async function updateLesson(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    const { name, description, content, order, finalTestId } = req.body;

    // Verify if the lesson exists and belongs to a module from a course from the company
    const lessonExists: { id: string; moduleId: string } | null = await prisma.$queryRaw`
      SELECT l.id, l."moduleId"
      FROM "TrainingLesson" l
      JOIN "TrainingModule" m ON l."moduleId" = m.id
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE l.id = ${id} AND c."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!lessonExists) {
      return res.status(404).json({ error: 'Lição não encontrada' });
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

    // If order is changed, handle reordering of other lessons
    if (order !== undefined) {
      // Get current order of the lesson
      const currentLesson: { currentOrder: number } | null = await prisma.$queryRaw`
        SELECT "order" as "currentOrder"
        FROM "TrainingLesson"
        WHERE id = ${id}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (currentLesson && currentLesson.currentOrder !== order) {
        // If moving up in order (e.g., from 3 to 1)
        if (order < currentLesson.currentOrder) {
          await prisma.$executeRaw`
            UPDATE "TrainingLesson"
            SET "order" = "order" + 1
            WHERE "moduleId" = ${lessonExists.moduleId}
              AND "order" >= ${order}
              AND "order" < ${currentLesson.currentOrder}
              AND id != ${id}
          `;
        } 
        // If moving down in order (e.g., from 1 to 3)
        else if (order > currentLesson.currentOrder) {
          await prisma.$executeRaw`
            UPDATE "TrainingLesson"
            SET "order" = "order" - 1
            WHERE "moduleId" = ${lessonExists.moduleId}
              AND "order" <= ${order}
              AND "order" > ${currentLesson.currentOrder}
              AND id != ${id}
          `;
        }
      }
    }

    // Build the update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push(`name = ${Prisma.raw('$' + (updateValues.length + 1))}`);
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push(`description = ${Prisma.raw('$' + (updateValues.length + 1))}`);
      updateValues.push(description);
    }

    if (content !== undefined) {
      updateFields.push(`content = ${Prisma.raw('$' + (updateValues.length + 1))}`);
      updateValues.push(content);
    }

    if (order !== undefined) {
      updateFields.push(`"order" = ${Prisma.raw('$' + (updateValues.length + 1))}`);
      updateValues.push(order);
    }

    if (finalTestId !== undefined) {
      updateFields.push(`"finalTestId" = ${Prisma.raw('$' + (updateValues.length + 1))}`);
      updateValues.push(finalTestId);
    }

    // Add updated timestamp
    updateFields.push(`"updatedAt" = ${Prisma.raw('NOW()')}`);

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido' });
    }

    // Execute the update
    const updateQuery = `
      UPDATE "TrainingLesson"
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length + 1}
      RETURNING *
    `;

    updateValues.push(id);

    const updatedLesson = await prisma.$queryRawUnsafe(updateQuery, ...updateValues)
      .then((results: any[]) => results[0] || null);

    if (!updatedLesson) {
      return res.status(500).json({ error: 'Erro ao atualizar lição' });
    }

    return res.status(200).json(updatedLesson);
  } catch (error) {
    console.error('Erro ao atualizar lição:', error);
    return res.status(500).json({ error: 'Erro ao atualizar lição' });
  }
}

// Delete a lesson
async function deleteLesson(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Verify if the lesson exists and belongs to a module from a course from the company
    const lessonExists: { id: string; moduleId: string; lessonOrder: number } | null = await prisma.$queryRaw`
      SELECT l.id, l."moduleId", l."order" as "lessonOrder"
      FROM "TrainingLesson" l
      JOIN "TrainingModule" m ON l."moduleId" = m.id
      JOIN "TrainingCourse" c ON m."courseId" = c.id
      WHERE l.id = ${id} AND c."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!lessonExists) {
      return res.status(404).json({ error: 'Lição não encontrada' });
    }

    // Delete related progress records first
    await prisma.$executeRaw`
      DELETE FROM "LessonProgress"
      WHERE "lessonId" = ${id}
    `;

    // Delete the lesson
    await prisma.$executeRaw`
      DELETE FROM "TrainingLesson"
      WHERE id = ${id}
    `;

    // Reorder remaining lessons
    await prisma.$executeRaw`
      UPDATE "TrainingLesson"
      SET "order" = "order" - 1
      WHERE "moduleId" = ${lessonExists.moduleId}
        AND "order" > ${lessonExists.lessonOrder}
    `;

    return res.status(200).json({ message: 'Lição excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir lição:', error);
    return res.status(500).json({ error: 'Erro ao excluir lição' });
  }
}
