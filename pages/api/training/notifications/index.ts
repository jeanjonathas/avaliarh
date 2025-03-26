import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';;

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

    // Buscar matrículas do estudante
    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        studentId: student.id,
        completionDate: null
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
        enrollmentDate: 'desc'
      }
    });

    // Criar notificações baseadas nas matrículas
    const notifications = [];

    // Notificação para cursos com progresso baixo
    for (const enrollment of enrollments) {
      if (enrollment.progress < 20) {
        notifications.push({
          id: `low-progress-${enrollment.id}`,
          type: 'warning',
          title: 'Curso com pouco progresso',
          message: `Você tem apenas ${enrollment.progress}% de progresso no curso "${enrollment.course.name}". Continue aprendendo!`,
          courseId: enrollment.course.id,
          date: new Date(),
          read: false
        });
      }
    }

    // Notificação para cursos quase completos
    for (const enrollment of enrollments) {
      if (enrollment.progress >= 80 && enrollment.progress < 100) {
        notifications.push({
          id: `almost-complete-${enrollment.id}`,
          type: 'info',
          title: 'Curso quase completo',
          message: `Você está com ${enrollment.progress}% de progresso no curso "${enrollment.course.name}". Falta pouco para concluir!`,
          courseId: enrollment.course.id,
          date: new Date(),
          read: false
        });
      }
    }

    // Buscar testes pendentes
    const pendingTests = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT
        tt.id as "testId",
        tt.name as "testName",
        tc.id as "courseId",
        tc.name as "courseName",
        tm.id as "moduleId",
        tm.name as "moduleName"
      FROM "TrainingTest" tt
      JOIN "TrainingModule" tm ON tm.id = ANY(
        SELECT m.id FROM "TrainingModule" m 
        WHERE m."finalTestId" = tt.id
      )
      JOIN "TrainingCourse" tc ON tc.id = tm."courseId"
      JOIN "CourseEnrollment" ce ON ce."courseId" = tc.id
      WHERE ce."studentId" = ${student.id}
      AND NOT EXISTS (
        SELECT 1 FROM "TestAttempt" ta 
        WHERE ta."testId" = tt.id 
        AND ta."studentId" = ${student.id}
        AND ta.passed = true
      )
      LIMIT 5
    `;

    // Adicionar notificações para testes pendentes
    for (const test of pendingTests) {
      notifications.push({
        id: `pending-test-${test.testId}`,
        type: 'info',
        title: 'Teste pendente',
        message: `Você tem um teste pendente: "${test.testName}" no módulo "${test.moduleName}" do curso "${test.courseName}"`,
        courseId: test.courseId,
        moduleId: test.moduleId,
        testId: test.testId,
        date: new Date(),
        read: false
      });
    }

    // Ordenar notificações por data (mais recentes primeiro)
    notifications.sort((a, b) => b.date.getTime() - a.date.getTime());

    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar notificações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
