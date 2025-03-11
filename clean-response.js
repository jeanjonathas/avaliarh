// Script para limpar a tabela Response
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanResponseTable() {
  try {
    // Limpar a tabela Response
    const deletedCount = await prisma.$executeRaw`DELETE FROM "Response"`;
    console.log(`Registros excluídos da tabela Response: ${deletedCount}`);
    
    await prisma.$disconnect();
    console.log('Tabela Response limpa com sucesso!');
  } catch (error) {
    console.error('Erro ao limpar a tabela Response:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanResponseTable();
