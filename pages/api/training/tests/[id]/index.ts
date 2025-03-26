import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../../lib/prisma';

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

    // Obter ID do teste da URL
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'ID do teste não fornecido' });
    }

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

    // Buscar detalhes do teste
    const test = await prisma.trainingTest.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            options: {
              select: {
                id: true,
                text: true,
                isCorrect: false // Não enviar a resposta correta para o cliente
              }
            }
          }
        },
        courseFinalTests: {
          select: {
            id: true,
            name: true
          }
        },
        moduleFinalTests: {
          select: {
            id: true,
            name: true,
            courseId: true,
            course: {
              select: {
                name: true
              }
            }
          }
        },
        lessonFinalTests: {
          select: {
            id: true,
            name: true,
            moduleId: true,
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
                }
              }
            }
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Teste não encontrado' });
    }

    // Determinar o curso associado ao teste
    let courseId = null;
    let moduleName = null;
    let courseName = null;
    let moduleId = null;
    let lessonId = null;
    let lessonName = null;
    let testType = 'UNKNOWN';

    // Verificar o tipo de teste e obter informações relacionadas
    if (test.courseFinalTests.length > 0) {
      // Teste de curso
      const course = test.courseFinalTests[0];
      courseId = course.id;
      courseName = course.name;
      testType = 'COURSE';
    } else if (test.moduleFinalTests.length > 0) {
      // Teste de módulo
      const moduleTest = test.moduleFinalTests[0];
      moduleId = moduleTest.id;
      moduleName = moduleTest.name;
      courseId = moduleTest.courseId;
      courseName = moduleTest.course.name;
      testType = 'MODULE';
    } else if (test.lessonFinalTests.length > 0) {
      // Teste de Aula
      const lesson = test.lessonFinalTests[0];
      lessonId = lesson.id;
      lessonName = lesson.name;
      moduleId = lesson.moduleId;
      moduleName = lesson.module.name;
      courseId = lesson.module.courseId;
      courseName = lesson.module.course.name;
      testType = 'LESSON';
    }
    
    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teste não está associado a nenhum curso' 
      });
    }

    // Verificar se o estudante está matriculado no curso
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId: student.id,
        courseId
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Estudante não está matriculado neste curso' 
      });
    }

    // Buscar tentativas anteriores
    const previousAttempts = await prisma.testAttempt.count({
      where: {
        studentId: student.id,
        testId: id
      }
    });

    // Buscar melhor pontuação
    const bestScoreResult = await prisma.testAttempt.findFirst({
      where: {
        studentId: student.id,
        testId: id
      },
      orderBy: {
        score: 'desc'
      },
      select: {
        score: true
      }
    });

    // Formatar questões para remover as respostas corretas
    const formattedQuestions = test.questions.map(question => ({
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options.map(option => ({
        id: option.id,
        text: option.text
      }))
    }));

    // Formatar resposta
    const formattedTest = {
      id: test.id,
      name: test.name,
      description: test.description,
      type: testType,
      courseId: courseId,
      courseName: courseName,
      moduleId: moduleId,
      moduleName: moduleName,
      lessonId: lessonId,
      lessonName: lessonName,
      timeLimit: test.timeLimit,
      passingScore: test.passingScore,
      questions: formattedQuestions,
      previousAttempts,
      maxAttempts: test.attempts,
      bestScore: bestScoreResult?.score || 0
    };

    return res.status(200).json(formattedTest);
  } catch (error) {
    console.error('Erro ao buscar teste:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar teste',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
