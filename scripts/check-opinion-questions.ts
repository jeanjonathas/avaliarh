import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function main() {
  try {
    console.log('Verificando perguntas opinativas...');
    
    // Buscar todas as perguntas do tipo opinião múltipla
    const questions = await prisma.question.findMany({
      where: {
        type: 'OPINION_MULTIPLE',
      },
      include: {
        options: true
      }
    });
    
    console.log(`Total de perguntas opinativas: ${questions.length}`);
    
    // Mostrar detalhes de cada pergunta
    questions.forEach((question, index) => {
      console.log(`\nPergunta ${index + 1}:`);
      console.log(`ID: ${question.id}`);
      console.log(`Texto: ${question.text}`);
      console.log(`Tipo de questão: ${question.questionType || 'não definido'}`);
      console.log(`Opções: ${question.options.length}`);
      
      // Verificar se as opções têm categorias
      const categoriesMap = new Map();
      question.options.forEach(option => {
        if (option.categoryName && option.categoryNameUuid) {
          if (!categoriesMap.has(option.categoryNameUuid)) {
            categoriesMap.set(option.categoryNameUuid, {
              name: option.categoryName,
              count: 0
            });
          }
          categoriesMap.get(option.categoryNameUuid).count++;
        }
      });
      
      console.log('Categorias encontradas:');
      if (categoriesMap.size === 0) {
        console.log('  Nenhuma categoria encontrada nas opções');
      } else {
        Array.from(categoriesMap.entries()).forEach(([uuid, data]) => {
          console.log(`  - ${data.name} (UUID: ${uuid}): ${data.count} opções`);
        });
      }
    });
    
  } catch (error) {
    console.error('Erro ao verificar perguntas opinativas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
