import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { TrainingQuestionType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é POST
  if (req.method !== 'POST') {
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

    // Obter respostas do corpo da requisição
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'Respostas não fornecidas ou formato inválido' });
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
        courseFinalTests: {
          select: {
            id: true
          }
        },
        moduleFinalTests: {
          select: {
            id: true,
            courseId: true
          }
        },
        lessonFinalTests: {
          select: {
            id: true,
            moduleId: true,
            module: {
              select: {
                courseId: true
              }
            }
          }
        },
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Teste não encontrado' });
    }

    // Determinar o curso associado ao teste
    let courseId: string | undefined;
    
    if (test.courseFinalTests.length > 0) {
      courseId = test.courseFinalTests[0].id;
    } else if (test.moduleFinalTests.length > 0) {
      courseId = test.moduleFinalTests[0].courseId;
    } else if (test.lessonFinalTests.length > 0 && test.lessonFinalTests[0].module) {
      courseId = test.lessonFinalTests[0].module.courseId;
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

    // Verificar limite de tentativas
    if (test.attempts) {
      const attemptCount = await prisma.testAttempt.count({
        where: {
          studentId: student.id,
          testId: id
        }
      });

      if (attemptCount >= test.attempts) {
        return res.status(403).json({ 
          success: false, 
          message: 'Limite de tentativas excedido' 
        });
      }
    }

    // Calcular pontuação
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const correctOptionsByQuestion = {};

    test.questions.forEach(question => {
      const questionId = question.id;
      const userAnswers = answers[questionId] || [];
      
      // Obter as opções corretas para esta questão
      const correctOptions = question.options
        .filter(option => option.isCorrect)
        .map(option => option.id);
      
      correctOptionsByQuestion[questionId] = correctOptions;
      
      // Verificar se a resposta está correta
      if (question.type === TrainingQuestionType.MULTIPLE_CHOICE) {
        // Para questões de múltipla escolha, todas as opções corretas devem ser selecionadas
        // e nenhuma opção incorreta deve ser selecionada
        const allCorrectSelected = correctOptions.every(optId => userAnswers.includes(optId));
        const noIncorrectSelected = userAnswers.every(optId => correctOptions.includes(optId));
        
        if (allCorrectSelected && noIncorrectSelected) {
          correctAnswers++;
        } else {
          incorrectAnswers++;
        }
      } else if (question.type === TrainingQuestionType.TRUE_FALSE) {
        // Para questões de verdadeiro/falso, deve haver exatamente uma resposta correta
        if (userAnswers.length === 1 && correctOptions.includes(userAnswers[0])) {
          correctAnswers++;
        } else {
          incorrectAnswers++;
        }
      } else {
        // Para outros tipos de questões (ESSAY, OPINION_MULTIPLE)
        // Vamos considerar como corretas para não afetar a pontuação
        correctAnswers++;
      }
    });

    // Calcular pontuação percentual
    const totalQuestions = test.questions.length;
    const score = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;
    
    // Determinar se o aluno passou no teste
    const passed = score >= test.passingScore;

    // Registrar resultado do teste
    const testResult = await prisma.testAttempt.create({
      data: {
        studentId: student.id,
        testId: id,
        score,
        passed,
        endTime: new Date()
      }
    });

    // Se o teste for de um módulo e o aluno passou, verificar se todas as aulas foram concluídas
    let moduleId: string | undefined;
    
    if (test.moduleFinalTests.length > 0) {
      moduleId = test.moduleFinalTests[0].id;
    } else if (test.lessonFinalTests.length > 0) {
      moduleId = test.lessonFinalTests[0].moduleId;
    }
    
    if (moduleId && passed) {
      // Verificar se todas as aulas do módulo foram concluídas
      const moduleLessons = await prisma.trainingLesson.findMany({
        where: {
          moduleId
        },
        select: {
          id: true
        }
      });

      const moduleLessonIds = moduleLessons.map(l => l.id);
      
      const completedLessons = await prisma.lessonProgress.findMany({
        where: {
          studentId: student.id,
          lessonId: {
            in: moduleLessonIds
          },
          completed: true
        }
      });

      // Se todas as aulas foram concluídas, marcar o módulo como concluído no progresso do curso
      if (completedLessons.length === moduleLessons.length) {
        // Atualizar o progresso do curso diretamente
        await updateCourseProgress(student.id, courseId);
      }
    }

    // Atualizar progresso do curso
    await updateCourseProgress(student.id, courseId);

    // Retornar resultados
    return res.status(200).json({
      score,
      correctAnswers,
      incorrectAnswers,
      passed,
      correctOptionsByQuestion
    });
  } catch (error) {
    console.error('Erro ao submeter teste:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao submeter teste',
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

    // Atualizar matrícula
    await prisma.courseEnrollment.findFirst({
      where: {
        studentId,
        courseId
      }
    }).then(enrollment => {
      if (enrollment) {
        return prisma.courseEnrollment.update({
          where: {
            id: enrollment.id
          },
          data: {
            progress,
            completionDate: completedModulesCount === totalModules ? new Date() : null
          }
        });
      }
    });

    // Atualizar progresso geral do estudante
    await prisma.student.update({
      where: {
        id: studentId
      },
      data: {
        // Recalcular progresso geral do estudante
        // (média de progresso de todos os cursos matriculados)
        progress: {
          set: await prisma.$queryRaw`
            SELECT COALESCE(ROUND(AVG(progress)), 0)
            FROM "CourseEnrollment"
            WHERE "studentId" = ${studentId}
          `
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Erro ao atualizar progresso do curso:', error);
    return false;
  }
}
