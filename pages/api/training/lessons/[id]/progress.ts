import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação usando getServerSession em vez de getSession
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.error('Erro de autenticação: Sessão inválida ou usuário não identificado');
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    // Obter ID da aula da URL
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'ID da aula não fornecido ou inválido' });
    }
    
    // Obter dados do corpo da requisição
    const { timeSpent, completed } = req.body;
    
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
      where: { id },
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
          lessonId: id
        }
      },
      update: {
        timeSpent: timeSpent || 0,
        completed: completed !== undefined ? completed : false,
        updatedAt: new Date()
      },
      create: {
        studentId: student.id,
        lessonId: id,
        timeSpent: timeSpent || 0,
        completed: completed !== undefined ? completed : false
      }
    });

    // Registrar acesso
    await prisma.trainingAccessLog.create({
      data: {
        studentId: student.id,
        courseId: lesson.module.course.id,
        accessDate: new Date(),
        timeSpent: timeSpent || 0
      }
    });

    // Se a aula foi marcada como concluída, atualizar o progresso do curso
    if (completed) {
      await updateCourseProgress(student.id, lesson.module.course.id);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Progresso atualizado com sucesso',
      data: {
        lessonId: id,
        timeSpent: lessonProgress.timeSpent,
        completed: lessonProgress.completed
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar progresso da aula',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função auxiliar para atualizar o progresso do curso
async function updateCourseProgress(studentId: string, courseId: string) {
  try {
    // Contar total de módulos no curso
    const totalModules = await prisma.trainingModule.count({
      where: {
        courseId
      }
    });

    if (totalModules === 0) {
      return false;
    }

    // Obter todos os módulos do curso
    const modules = await prisma.trainingModule.findMany({
      where: {
        courseId
      },
      include: {
        lessons: {
          select: {
            id: true
          }
        }
      }
    });

    // Contar módulos concluídos verificando se todas as lições de cada módulo foram concluídas
    let completedModulesCount = 0;

    for (const courseModule of modules) {
      if (courseModule.lessons.length === 0) {
        continue; // Pular módulos sem lições
      }

      const lessonIds = courseModule.lessons.map(l => l.id);
      
      const completedLessonsCount = await prisma.lessonProgress.count({
        where: {
          studentId,
          lessonId: {
            in: lessonIds
          },
          completed: true
        }
      });

      // Se todas as lições do módulo foram concluídas, considerar o módulo como concluído
      if (completedLessonsCount === courseModule.lessons.length) {
        completedModulesCount++;
      }
    }

    // Calcular progresso
    const progress = Math.round((completedModulesCount / totalModules) * 100);

    // Buscar a matrícula
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId,
        courseId
      }
    });

    if (enrollment) {
      // Atualizar matrícula
      await prisma.courseEnrollment.update({
        where: {
          id: enrollment.id
        },
        data: {
          progress,
          completionDate: completedModulesCount === totalModules ? new Date() : null
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar progresso do curso:', error);
    return false;
  }
}
