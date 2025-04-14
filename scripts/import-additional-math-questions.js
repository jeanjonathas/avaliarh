const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function importAdditionalMathQuestions() {
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

    // Encontrar a categoria de Matemática Básica
    const mathCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'Matemática Básica'
        }
      }
    });

    if (!mathCategory) {
      console.log('Categoria de Matemática Básica não encontrada');
      return;
    }

    console.log('Categoria encontrada:', mathCategory.name, 'ID:', mathCategory.id);

    // Questões adicionais de Matemática Básica
    const additionalMathQuestions = [
      {
        text: 'Se um cão pesa 20 kg e deve receber 2,5 mg de medicamento por quilo, qual a dose total?',
        options: [
          { text: '40 mg', isCorrect: false },
          { text: '50 mg', isCorrect: true },
          { text: '45 mg', isCorrect: false },
          { text: '55 mg', isCorrect: false }
        ]
      },
      {
        text: 'Se um estoque tem 250 unidades de um produto e são vendidos 40 por dia, em quantos dias ele acabará?',
        options: [
          { text: '5', isCorrect: false },
          { text: '6', isCorrect: false },
          { text: '7', isCorrect: true },
          { text: '8', isCorrect: false }
        ]
      },
      {
        text: 'Qual o valor de 15% de 200?',
        options: [
          { text: '25', isCorrect: false },
          { text: '30', isCorrect: true },
          { text: '35', isCorrect: false },
          { text: '40', isCorrect: false }
        ]
      },
      {
        text: 'Um cliente pagou R$ 78,00 por três produtos iguais. Qual o valor de cada um?',
        options: [
          { text: 'R$ 22,00', isCorrect: false },
          { text: 'R$ 25,00', isCorrect: false },
          { text: 'R$ 26,00', isCorrect: true },
          { text: 'R$ 30,00', isCorrect: false }
        ]
      },
      {
        text: 'Se um gato consome 300g de ração por dia, quantos kg ele consumirá em 10 dias?',
        options: [
          { text: '2 kg', isCorrect: false },
          { text: '3 kg', isCorrect: true },
          { text: '4 kg', isCorrect: false },
          { text: '5 kg', isCorrect: false }
        ]
      }
    ];

    // Contar questões existentes para definir a ordem
    const existingQuestionsCount = await prisma.question.count({
      where: {
        stageId: mathStage.id
      }
    });

    console.log(`Já existem ${existingQuestionsCount} questões na etapa de Matemática Básica`);

    // Importar as questões adicionais
    let importedCount = 0;

    for (const [index, question] of additionalMathQuestions.entries()) {
      // Verificar se a questão já existe
      const existingQuestion = await prisma.question.findFirst({
        where: {
          text: question.text,
          stageId: mathStage.id
        }
      });

      if (existingQuestion) {
        console.log(`Questão já existe: ${question.text.substring(0, 30)}...`);
        continue;
      }

      // Criar a questão e suas opções
      const createdQuestion = await prisma.question.create({
        data: {
          text: question.text,
          stageId: mathStage.id,
          categoryId: mathCategory.id,
          options: {
            create: question.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          }
        }
      });

      // Criar a relação StageQuestion
      await prisma.stageQuestion.create({
        data: {
          stageId: mathStage.id,
          questionId: createdQuestion.id,
          order: existingQuestionsCount + index // Ordem dentro da etapa
        }
      });

      // Verificar se o teste GIA existe
      const giaTest = await prisma.tests.findFirst({
        where: {
          title: 'Teste de Inteligência Geral - GIA'
        }
      });

      if (giaTest) {
        // Criar a relação TestQuestion
        await prisma.testQuestion.create({
          data: {
            testId: giaTest.id,
            stageId: mathStage.id,
            questionId: createdQuestion.id,
            order: existingQuestionsCount + index
          }
        });
      }

      importedCount++;
      console.log(`Questão importada: ${question.text.substring(0, 30)}...`);
    }

    console.log(`Importação concluída! ${importedCount} questões adicionais de Matemática Básica importadas.`);

  } catch (error) {
    console.error('Erro durante a importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função principal
importAdditionalMathQuestions()
  .then(() => console.log('Processo finalizado!'))
  .catch(error => console.error('Erro fatal:', error));
