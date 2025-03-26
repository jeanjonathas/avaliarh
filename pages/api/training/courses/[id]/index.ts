import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
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

    // Obter ID do curso da URL
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'ID do curso não fornecido' });
    }

    // Verificar se o estudante está matriculado no curso
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId: student.id,
        courseId: id
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Estudante não está matriculado neste curso' 
      });
    }

    // Buscar detalhes do curso
    const course = await prisma.trainingCourse.findUnique({
      where: { id },
      include: {
        sector: true,
        modules: {
          orderBy: {
            order: 'asc'
          },
          include: {
            lessons: {
              orderBy: {
                order: 'asc'
              },
              select: {
                id: true,
                name: true,
                description: true,
                type: true,
                order: true,
                duration: true
              }
            },
            finalTest: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    }

    // Buscar progresso do estudante para cada Aula
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: {
        studentId: student.id,
        lessonId: {
          in: course.modules.flatMap(module => module.lessons.map(lesson => lesson.id))
        }
      }
    });

    // Mapear o progresso para cada Aula
    const lessonProgressMap = lessonProgress.reduce((map, progress) => {
      map[progress.lessonId] = progress.completed;
      return map;
    }, {} as Record<string, boolean>);

    // Formatar os módulos com informações de progresso
    const formattedModules = course.modules.map(module => {
      const totalLessons = module.lessons.length;
      const completedLessons = module.lessons.filter(lesson => 
        lessonProgressMap[lesson.id]
      ).length;
      
      const moduleProgress = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100) 
        : 0;
      
      const formattedLessons = module.lessons.map(lesson => ({
        ...lesson,
        completed: !!lessonProgressMap[lesson.id]
      }));

      return {
        id: module.id,
        name: module.name,
        description: module.description,
        order: module.order,
        lessons: formattedLessons,
        progress: moduleProgress,
        completed: totalLessons > 0 && completedLessons === totalLessons,
        hasFinalTest: !!module.finalTest
      };
    });

    // Calcular progresso geral do curso
    const totalLessons = course.modules.reduce(
      (total, module) => total + module.lessons.length, 
      0
    );
    
    const completedLessons = lessonProgress.filter(progress => progress.completed).length;
    
    const courseProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    // Formatar resposta
    const formattedCourse = {
      id: course.id,
      name: course.name,
      description: course.description,
      sector: course.sector ? {
        id: course.sector.id,
        name: course.sector.name
      } : null,
      modules: formattedModules,
      progress: courseProgress,
      completed: enrollment.completionDate !== null,
      enrollmentDate: enrollment.enrollmentDate,
      completionDate: enrollment.completionDate
    };

    return res.status(200).json(formattedCourse);
  } catch (error) {
    console.error('Erro ao buscar detalhes do curso:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar detalhes do curso',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
