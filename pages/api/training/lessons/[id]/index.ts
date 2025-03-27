import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é GET
  if (req.method !== 'GET') {
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
      return res.status(400).json({ 
        success: false, 
        message: 'ID da aula não fornecido' 
      });
    }

    // Obter ID do usuário da sessão
    const userId = session.user.id;

    // Verificar se o usuário é um estudante
    // Garantir que a conexão com o banco de dados esteja ativa
    await reconnectPrisma();
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(403).json({ 
        success: false, 
        message: 'Usuário não é um estudante' 
      });
    }

    // Buscar detalhes da aula
    const lesson = await prisma.trainingLesson.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            courseId: true,
            course: {
              select: {
                id: true,
                name: true
              }
            },
            finalTest: {
              select: {
                id: true
              }
            }
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
        courseId: lesson.module.courseId
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Estudante não está matriculado neste curso' 
      });
    }

    // Verificar progresso da aula
    const lessonProgress = await prisma.lessonProgress.findFirst({
      where: {
        studentId: student.id,
        lessonId: id
      }
    });

    // Buscar aula anterior e próxima aula
    const moduleLessons = await prisma.trainingLesson.findMany({
      where: {
        moduleId: lesson.moduleId
      },
      orderBy: {
        order: 'asc'
      },
      select: {
        id: true,
        order: true
      }
    });

    const currentLessonIndex = moduleLessons.findIndex(l => l.id === id);
    const prevLessonId = currentLessonIndex > 0 ? moduleLessons[currentLessonIndex - 1].id : null;
    const nextLessonId = currentLessonIndex < moduleLessons.length - 1 ? moduleLessons[currentLessonIndex + 1].id : null;

    // Formatar resposta
    const formattedLesson = {
      id: lesson.id,
      name: lesson.name,
      description: lesson.description,
      moduleId: lesson.moduleId,
      moduleName: lesson.module.name,
      courseId: lesson.module.courseId,
      courseName: lesson.module.course.name,
      type: lesson.type,
      content: lesson.content,
      duration: lesson.duration || 0,
      order: lesson.order,
      finalTestId: lesson.module.finalTest?.id,
      prevLessonId,
      nextLessonId,
      completed: lessonProgress?.completed || false,
      timeSpent: lessonProgress?.timeSpent || 0
    };

    return res.status(200).json(formattedLesson);
  } catch (error) {
    console.error('Erro ao buscar detalhes da aula:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar detalhes da aula',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
