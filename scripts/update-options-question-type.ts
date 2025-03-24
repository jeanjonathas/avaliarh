// Importação modificada para evitar conflito de redeclaração
import { PrismaClient as PrismaClientUpdate } from '@prisma/client';

// Inicializar o cliente Prisma
const prisma = new PrismaClientUpdate();

async function updateOptionsQuestionType() {
  try {
    console.log('Iniciando atualização do questionType nas opções...');

    // 1. Buscar todas as perguntas que têm questionType definido
    const questions = await prisma.question.findMany({
      where: {
        questionType: {
          not: null
        }
      },
      select: {
        id: true,
        questionType: true
      }
    });

    console.log(`Encontradas ${questions.length} perguntas com questionType definido.`);

    // 2. Para cada pergunta, atualizar suas opções com o mesmo questionType
    let totalUpdated = 0;

    for (const question of questions) {
      // Usando updateMany para atualizar todas as opções de uma vez
      const result = await prisma.option.updateMany({
        where: {
          questionId: question.id,
          // @ts-ignore - O tipo ainda não foi atualizado no Prisma Client
          questionType: null
        },
        data: {
          // @ts-ignore - O tipo ainda não foi atualizado no Prisma Client
          questionType: question.questionType
        }
      });

      totalUpdated += result.count;
      console.log(`Atualizadas ${result.count} opções para a pergunta ${question.id} com questionType = ${question.questionType}`);
    }

    console.log(`Processo concluído! Total de ${totalUpdated} opções atualizadas.`);
  } catch (error) {
    console.error('Erro ao atualizar opções:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função
updateOptionsQuestionType()
  .then(() => {
    console.log('Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao executar o script:', error);
    process.exit(1);
  });
