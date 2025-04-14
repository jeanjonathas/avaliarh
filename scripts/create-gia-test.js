const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function createGIATest() {
  try {
    console.log('Iniciando criação do Teste de Inteligência Geral - GIA...');

    // 1. Verificar se o teste já existe
    const existingTest = await prisma.tests.findFirst({
      where: {
        title: 'Teste de Inteligência Geral - GIA'
      }
    });

    if (existingTest) {
      console.log('O teste já existe. ID:', existingTest.id);
      return existingTest;
    }

    // 2. Criar o teste
    const test = await prisma.tests.create({
      data: {
        title: 'Teste de Inteligência Geral - GIA',
        description: 'Teste completo de avaliação de inteligência geral com 6 etapas: Raciocínio Lógico, Matemática Básica, Compreensão Verbal, Aptidão Espacial, Raciocínio Abstrato e Tomada de Decisão.',
        timeLimit: 60, // 60 minutos para completar o teste
        active: true
      }
    });

    console.log('Teste criado com sucesso. ID:', test.id);

    // 3. Obter todas as etapas existentes
    const stages = await prisma.stage.findMany({
      orderBy: {
        order: 'asc'
      }
    });

    if (stages.length < 6) {
      console.error('Não foram encontradas etapas suficientes no banco de dados');
      return test;
    }

    console.log(`Encontradas ${stages.length} etapas no banco de dados`);

    // 4. Associar as etapas ao teste
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      // Atualizar a etapa para associá-la ao teste
      await prisma.stage.update({
        where: { id: stage.id },
        data: { testId: test.id }
      });

      // Criar a relação TestStage
      await prisma.testStage.create({
        data: {
          testId: test.id,
          stageId: stage.id,
          order: i + 1
        }
      });

      console.log(`Etapa "${stage.title}" associada ao teste`);

      // 5. Obter as perguntas da etapa
      const questions = await prisma.question.findMany({
        where: { stageId: stage.id },
        include: { options: true }
      });

      console.log(`Encontradas ${questions.length} perguntas para a etapa "${stage.title}"`);

      // 6. Associar as perguntas ao teste
      for (let j = 0; j < questions.length; j++) {
        const question = questions[j];

        // Verificar se a relação TestQuestion já existe
        const existingTestQuestion = await prisma.testQuestion.findFirst({
          where: {
            testId: test.id,
            stageId: stage.id,
            questionId: question.id
          }
        });

        if (!existingTestQuestion) {
          // Criar a relação TestQuestion
          await prisma.testQuestion.create({
            data: {
              testId: test.id,
              stageId: stage.id,
              questionId: question.id,
              order: j + 1
            }
          });
        }
      }

      console.log(`${questions.length} perguntas associadas à etapa "${stage.title}" do teste`);
    }

    console.log('Teste de Inteligência Geral - GIA criado com sucesso!');
    return test;

  } catch (error) {
    console.error('Erro durante a criação do teste:', error);
    throw error;
  }
}

// Executar a função principal
createGIATest()
  .then(() => console.log('Processo finalizado!'))
  .catch(error => console.error('Erro fatal:', error))
  .finally(() => prisma.$disconnect());
