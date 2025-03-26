// Script para testar a conexão do Prisma
const { PrismaClient } = require('@prisma/client');
const { prisma, reconnectPrisma } = require('../lib/prisma');

async function testConnection() {
  try {
    console.log('Iniciando teste de conexão do Prisma');
    
    // Verificar a URL do banco de dados (ocultando a senha)
    const dbUrl = process.env.DATABASE_URL || '';
    console.log('URL original do banco de dados: ' + dbUrl.replace(/:[^:@]+@/, ':****@'));
    
    // Testar reconexão
    console.log('Testando reconexão do Prisma...');
    const reconnected = await reconnectPrisma();
    console.log('Reconexão ' + (reconnected ? 'bem-sucedida' : 'falhou'));
    
    // Fazer uma consulta simples
    console.log('Executando consulta para verificar conexão...');
    const companies = await prisma.company.findMany({
      take: 5,
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('Encontradas ' + companies.length + ' empresas');
    console.log('IDs das empresas encontradas:', companies.map(c => c.id).join(', '));
    
    // Fazer outra consulta para verificar consistência
    console.log('Executando segunda consulta para verificar consistência...');
    const companiesAgain = await prisma.company.findMany({
      take: 5,
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('Encontradas ' + companiesAgain.length + ' empresas na segunda consulta');
    console.log('IDs das empresas na segunda consulta:', companiesAgain.map(c => c.id).join(', '));
    
    // Verificar se os resultados são consistentes
    const areConsistent = companies.length === companiesAgain.length && 
      companies.every((company, index) => company.id === companiesAgain[index].id);
    
    console.log('Resultados consistentes entre as consultas: ' + (areConsistent ? 'SIM' : 'NÃO'));
    
    // Desconectar
    await prisma.$disconnect();
    console.log('Teste concluído com sucesso');
  } catch (error) {
    console.error('Erro durante o teste de conexão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testConnection();
