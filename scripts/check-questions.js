// Script para verificar se há perguntas cadastradas no banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar se há perguntas cadastradas
    const questionCount = await prisma.question.count();
    console.log(`Número de perguntas cadastradas: ${questionCount}`);

    if (questionCount > 0) {
      // Mostrar algumas perguntas como exemplo
      const questions = await prisma.question.findMany({
        take: 5,
        include: {
          stage: true,
          options: true
        }
      });
      
      console.log('\nExemplos de perguntas:');
      questions.forEach((question, index) => {
        console.log(`\n[${index + 1}] ${question.text}`);
        console.log(`   Etapa: ${question.stage.title}`);
        console.log('   Opções:');
        question.options.forEach((option, optIndex) => {
          console.log(`     ${optIndex + 1}. ${option.text}${option.isCorrect ? ' (Correta)' : ''}`);
        });
      });
    }

    // Verificar etapas
    const stageCount = await prisma.stage.count();
    console.log(`\nNúmero de etapas cadastradas: ${stageCount}`);

    // Verificar candidatos
    const candidateCount = await prisma.candidate.count();
    console.log(`\nNúmero de candidatos cadastrados: ${candidateCount}`);

  } catch (error) {
    console.error('Erro ao verificar o banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
