import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.error('Erro de autenticação: Sessão inválida ou usuário não identificado');
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

    // Obter tipo de histórico (all, access, lessons, tests)
    const type = (req.query.type as string) || 'all';
    
    // Obter parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Objeto para armazenar os resultados
    const result: any = {
      success: true,
      data: [],
      pagination: {
        page,
        limit
      }
    };

    // Buscar histórico com base no tipo
    if (type === 'all' || type === 'access') {
      // Buscar histórico de acesso
      const accessLogs = await prisma.trainingAccessLog.findMany({
        where: {
          studentId: student.id
        },
        include: {
          course: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          accessDate: 'desc'
        },
        take: type === 'access' ? limit : 5,
        skip: type === 'access' ? skip : 0
      });

      // Contar total de registros para paginação
      const totalAccessLogs = await prisma.trainingAccessLog.count({
        where: {
          studentId: student.id
        }
      });

      // Formatar os resultados de acesso
      const formattedAccessLogs = accessLogs.map(log => ({
        id: log.id,
        type: 'access',
        courseId: log.courseId,
        courseName: log.course.name,
        date: log.accessDate,
        timeSpent: log.timeSpent,
        description: `Acesso ao curso ${log.course.name}`,
        icon: 'FiClock'
      }));

      if (type === 'access') {
        result.data = formattedAccessLogs;
        result.pagination.total = totalAccessLogs;
        result.pagination.pages = Math.ceil(totalAccessLogs / limit);
      } else {
        result.accessLogs = formattedAccessLogs;
      }
    }

    if (type === 'all' || type === 'lessons') {
      // Buscar histórico de aulas concluídas
      const lessonProgress = await prisma.lessonProgress.findMany({
        where: {
          studentId: student.id,
          completed: true
        },
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: true
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: type === 'lessons' ? limit : 5,
        skip: type === 'lessons' ? skip : 0
      });

      // Contar total de registros para paginação
      const totalLessonProgress = await prisma.lessonProgress.count({
        where: {
          studentId: student.id,
          completed: true
        }
      });

      // Formatar os resultados de aulas
      const formattedLessonProgress = lessonProgress.map(progress => ({
        id: progress.id,
        type: 'lesson',
        lessonId: progress.lessonId,
        lessonName: progress.lesson.name,
        moduleId: progress.lesson.moduleId,
        moduleName: progress.lesson.module.name,
        courseId: progress.lesson.module.courseId,
        courseName: progress.lesson.module.course.name,
        date: progress.updatedAt,
        timeSpent: progress.timeSpent,
        description: `Aula concluída: ${progress.lesson.name}`,
        icon: 'FiBook'
      }));

      if (type === 'lessons') {
        result.data = formattedLessonProgress;
        result.pagination.total = totalLessonProgress;
        result.pagination.pages = Math.ceil(totalLessonProgress / limit);
      } else {
        result.lessonProgress = formattedLessonProgress;
      }
    }

    if (type === 'all' || type === 'tests') {
      // Buscar histórico de testes realizados
      const testAttempts = await prisma.testAttempt.findMany({
        where: {
          studentId: student.id
        },
        include: {
          test: true
        },
        orderBy: {
          endTime: "desc"
        },
        take: type === 'tests' ? limit : 5,
        skip: type === 'tests' ? skip : 0
      });

      // Buscar informações adicionais dos cursos para cada teste
      const testAttemptsWithCourseInfo = await Promise.all(
        testAttempts.map(async (attempt) => {
          // Buscar informações do módulo e curso relacionados ao teste
          // Verificar primeiro se o teste está relacionado a um módulo
          const moduleTest = await prisma.trainingModule.findFirst({
            where: {
              finalTestId: attempt.testId
            },
            include: {
              course: true
            }
          });

          // Se encontrou um módulo, retornar as informações
          if (moduleTest) {
            return {
              ...attempt,
              moduleInfo: {
                id: moduleTest.id,
                name: moduleTest.name,
                courseId: moduleTest.courseId,
                courseName: moduleTest.course.name
              }
            };
          }

          // Se não encontrou um módulo, verificar se é um teste final de curso
          const courseTest = await prisma.trainingCourse.findFirst({
            where: {
              finalTestId: attempt.testId
            }
          });

          // Se encontrou um curso, retornar as informações
          if (courseTest) {
            return {
              ...attempt,
              moduleInfo: {
                id: null,
                name: null,
                courseId: courseTest.id,
                courseName: courseTest.name
              }
            };
          }

          // Se não encontrou nenhuma relação, retornar apenas o teste
          return {
            ...attempt,
            moduleInfo: {
              id: null,
              name: null,
              courseId: null,
              courseName: "Teste independente"
            }
          };
        })
      );

      // Contar total de registros para paginação
      const totalTestAttempts = await prisma.testAttempt.count({
        where: {
          studentId: student.id
        }
      });

      // Formatar os resultados de testes
      const formattedTestAttempts = testAttemptsWithCourseInfo.map(attempt => ({
        id: attempt.id,
        type: 'test',
        testId: attempt.testId,
        testName: attempt.test.name,
        moduleId: attempt.moduleInfo?.id || null,
        moduleName: attempt.moduleInfo?.name || null,
        courseId: attempt.moduleInfo?.courseId || null,
        courseName: attempt.moduleInfo?.courseName || "Teste independente",
        date: attempt.endTime || attempt.updatedAt,
        score: attempt.score,
        passed: attempt.passed,
        description: `Teste realizado: ${attempt.test.name} - ${attempt.passed ? 'Aprovado' : 'Reprovado'}`,
        icon: 'FiAward'
      }));

      if (type === 'tests') {
        result.data = formattedTestAttempts;
        result.pagination.total = totalTestAttempts;
        result.pagination.pages = Math.ceil(totalTestAttempts / limit);
      } else {
        result.testAttempts = formattedTestAttempts;
      }
    }

    // Se for tipo 'all', combinar todos os resultados e ordenar por data
    if (type === 'all') {
      const allItems = [
        ...(result.accessLogs || []),
        ...(result.lessonProgress || []),
        ...(result.testAttempts || [])
      ];

      // Ordenar por data (mais recente primeiro)
      allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Aplicar paginação
      result.data = allItems.slice(skip, skip + limit);
      result.pagination.total = allItems.length;
      result.pagination.pages = Math.ceil(allItems.length / limit);
      
      // Remover propriedades temporárias
      delete result.accessLogs;
      delete result.lessonProgress;
      delete result.testAttempts;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar histórico',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
