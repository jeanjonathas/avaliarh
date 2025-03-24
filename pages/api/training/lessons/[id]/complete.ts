import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Obter ID da aula da URL
    const { id } = req.query;
    
    // Obter dados do corpo da requisição
    const { timeSpent } = req.body;
    
    if (!timeSpent || typeof timeSpent !== 'number') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tempo gasto é obrigatório e deve ser um número' 
      });
    }

    // Verificar autenticação
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    // Obter ID do usuário da sessão
    const userId = session.user.id;

    // Verificar se o usuário é um estudante
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(403).json({ 
        success: false, 
        message: 'Usuário não é um estudante' 
      });
    }

    // Verificar se a aula existe
    const lesson = await prisma.trainingLesson.findUnique({
      where: { id: id as string },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aula não encontrada' 
      });
    }

    // Verificar se o estudante está matriculado no curso
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId: student.id,
        courseId: lesson.module.course.id
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Estudante não está matriculado neste curso' 
      });
    }

    // Atualizar ou criar registro de progresso
    const lessonProgress = await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: student.id,
          lessonId: id as string
        }
      },
      update: {
        timeSpent: timeSpent,
        completed: true,
        completedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        studentId: student.id,
        lessonId: id as string,
        timeSpent: timeSpent,
        completed: true,
        completedAt: new Date()
      }
    });

    // Registrar acesso
    await prisma.trainingAccessLog.create({
      data: {
        studentId: student.id,
        courseId: lesson.module.course.id,
        accessDate: new Date(),
        timeSpent: timeSpent
      }
    });

    // Verificar se todas as aulas do módulo foram concluídas
    const moduleLessons = await prisma.trainingLesson.findMany({
      where: {
        moduleId: lesson.module.id
      }
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        studentId: student.id,
        lesson: {
          moduleId: lesson.module.id
        },
        completed: true
      }
    });

    const moduleComplete = moduleLessons.length === completedLessons;

    // Verificar se todas as aulas do curso foram concluídas
    const courseLessons = await prisma.trainingLesson.findMany({
      where: {
        module: {
          courseId: lesson.module.course.id
        }
      }
    });

    const completedCourseLessons = await prisma.lessonProgress.count({
      where: {
        studentId: student.id,
        lesson: {
          module: {
            courseId: lesson.module.course.id
          }
        },
        completed: true
      }
    });

    // Calcular progresso do curso
    const courseProgress = Math.round((completedCourseLessons / courseLessons.length) * 100);

    // Atualizar progresso do curso na matrícula
    await prisma.courseEnrollment.update({
      where: {
        id: enrollment.id
      },
      data: {
        progress: courseProgress,
        completionDate: courseProgress === 100 ? new Date() : null
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Aula marcada como concluída com sucesso',
      data: {
        lessonId: id,
        completed: true,
        moduleComplete,
        courseProgress
      }
    });
  } catch (error) {
    console.error('Erro ao marcar aula como concluída:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao marcar aula como concluída',
      error: error.message
    });
  }
}
