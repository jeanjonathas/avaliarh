const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMathQuestions() {
  try {
    // Encontrar a etapa de Matemática Básica
    const mathStage = await prisma.stage.findFirst({
      where: {
        title: {
          contains: 'Matemática Básica'
        }
      }
    });

    if (!mathStage) {
      console.log('Etapa de Matemática Básica não encontrada');
      return;
    }

    console.log('Etapa de Matemática Básica encontrada:', mathStage.title, 'ID:', mathStage.id);

    // Obter as questões dessa etapa
    const questions = await prisma.question.findMany({
      where: {
        stageId: mathStage.id
      },
      include: {
        options: true
      }
    });

    console.log('Questões encontradas:', questions.length);

    // Exibir as questões
    questions.forEach((q, i) => {
      console.log(`\n[${i+1}] ${q.text}`);
      q.options.forEach(opt => {
        console.log(`  - ${opt.text}${opt.isCorrect ? ' (Correta)' : ''}`);
      });
    });

  } catch (error) {
    console.error('Erro ao verificar questões:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMathQuestions();
