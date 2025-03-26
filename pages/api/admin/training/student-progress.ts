import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  console.log('[STUDENT_PROGRESS] Verificando sessão em training/student-progress');
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    console.log('[STUDENT_PROGRESS] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[STUDENT_PROGRESS] Forçando reconexão do Prisma antes de buscar progresso dos estudantes');
  await reconnectPrisma();

  // Get user and check if they are an admin
  console.log(`[STUDENT_PROGRESS] Buscando usuário com ID: ${session.user.id}`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      role: true
    }
  });

  if (!user || (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'INSTRUCTOR')) {
    console.log('[STUDENT_PROGRESS] Acesso negado: Usuário não tem permissão');
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado' 
    });
  }

  const companyId = user.companyId;

  try {
    console.log(`[STUDENT_PROGRESS] Buscando progresso dos estudantes para a empresa: ${companyId}`);
    
    // Verificar se existem estudantes para a empresa
    const studentsCount = await prisma.student.count({
      where: {
        companyId: companyId
      }
    });
    
    console.log(`[STUDENT_PROGRESS] Encontrados ${studentsCount} estudantes`);
    
    // Se não houver estudantes, retornar uma resposta vazia
    if (studentsCount === 0) {
      console.log('[STUDENT_PROGRESS] Nenhum estudante encontrado, retornando array vazio');
      return res.status(200).json({
        success: true,
        progress: []
      });
    }
    
    // Buscar progresso dos estudantes usando Prisma
    const studentProgress = await prisma.student.findMany({
      where: {
        companyId: companyId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        courseEnrollments: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                modules: {
                  include: {
                    lessons: true
                  }
                }
              }
            }
          }
        },
        lessonProgress: true
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });
    
    // Processar os dados para calcular o progresso
    const formattedProgress = studentProgress.map(student => {
      const courses = student.courseEnrollments.map(enrollment => {
        const course = enrollment.course;
        
        // Calcular progresso por módulo
        const moduleProgress = course.modules.map(module => {
          const totalLessons = module.lessons.length;
          const completedLessons = student.lessonProgress.filter(
            progress => module.lessons.some(lesson => lesson.id === progress.lessonId)
          ).length;
          
          const progressPercentage = totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0;
          
          // Determinar status
          let status = 'not_started';
          if (completedLessons === totalLessons && totalLessons > 0) {
            status = 'completed';
          } else if (completedLessons > 0) {
            status = 'in_progress';
          }
          
          // Encontrar data da última atividade
          const moduleLessonIds = module.lessons.map(lesson => lesson.id);
          const moduleProgress = student.lessonProgress.filter(
            progress => moduleLessonIds.includes(progress.lessonId)
          );
          
          const lastActivity = moduleProgress.length > 0
            ? moduleProgress.reduce((latest, current) => {
                return current.completedAt && (!latest || current.completedAt > latest)
                  ? current.completedAt
                  : latest;
              }, null as Date | null)
            : null;
          
          return {
            moduleId: module.id,
            moduleName: module.name,
            progress: progressPercentage,
            completedLessons,
            totalLessons,
            status,
            lastActivity
          };
        });
        
        // Calcular progresso geral do curso
        const allLessons = course.modules.flatMap(module => module.lessons);
        const totalLessons = allLessons.length;
        const completedLessons = student.lessonProgress.filter(
          progress => allLessons.some(lesson => lesson.id === progress.lessonId)
        ).length;
        
        const courseProgressPercentage = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0;
        
        // Determinar status do curso
        let courseStatus = 'not_started';
        if (completedLessons === totalLessons && totalLessons > 0) {
          courseStatus = 'completed';
        } else if (completedLessons > 0) {
          courseStatus = 'in_progress';
        }
        
        return {
          courseId: course.id,
          courseName: course.name,
          progress: courseProgressPercentage,
          status: courseStatus,
          modules: moduleProgress
        };
      });
      
      return {
        studentId: student.id,
        studentName: student.user.name,
        studentEmail: student.user.email,
        courses
      };
    });
    
    console.log(`[STUDENT_PROGRESS] Retornando progresso para ${formattedProgress.length} estudantes`);
    
    return res.status(200).json({
      success: true,
      progress: formattedProgress
    });
  } catch (error) {
    console.error('[STUDENT_PROGRESS] Erro ao buscar progresso dos estudantes:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar progresso dos estudantes' 
    });
  }
}
