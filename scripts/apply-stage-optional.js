// Script para aplicar a alteração que torna o campo stageId opcional
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function main() {
  try {
    console.log('Iniciando a execução do script para tornar stageId opcional...');
    
    // Executar a query SQL diretamente através do Prisma
    const result = await prisma.$executeRawUnsafe(
      `ALTER TABLE "Question" ALTER COLUMN "stageId" DROP NOT NULL;`
    );
    
    console.log('Alteração aplicada com sucesso!');
    console.log('Resultado:', result);
    
    // Regenerar o Prisma Client para reconhecer as alterações
    console.log('Agora você pode executar "npx prisma generate" para atualizar o Prisma Client');
    
  } catch (error) {
    console.error('Erro ao aplicar a alteração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
