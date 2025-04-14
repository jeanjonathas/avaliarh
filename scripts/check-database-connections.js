const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Função para verificar conexões de banco de dados
async function checkDatabaseConnections() {
  console.log('Verificando conexões de banco de dados...');
  console.log('===========================================');
  
  // Exibir informações sobre a configuração do banco de dados
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : 'Não configurado');
  
  // Verificar se existem outros arquivos .env
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
  ];
  
  console.log('\nArquivos de ambiente encontrados:');
  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`- ${file}: Encontrado`);
      
      // Ler o conteúdo do arquivo para verificar se há configuração de banco de dados
      const content = fs.readFileSync(filePath, 'utf8');
      const hasDbConfig = content.includes('DATABASE_URL');
      console.log(`  - Contém DATABASE_URL: ${hasDbConfig ? 'Sim' : 'Não'}`);
    } else {
      console.log(`- ${file}: Não encontrado`);
    }
  });
  
  // Verificar a conexão com o banco de dados
  console.log('\nTestando conexão com o banco de dados...');
  try {
    const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});
    
    // Testar a conexão fazendo uma consulta simples
    const companyCount = await prisma.company.count();
    console.log(`Conexão bem-sucedida! Número de empresas no banco: ${companyCount}`);
    
    // Listar todas as empresas para verificar se há duplicatas
    console.log('\nVerificando empresas no banco de dados...');
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cnpj: true,
        planType: true,
        isActive: true,
        createdAt: true,
      }
    });
    
    console.log(`Total de empresas encontradas: ${companies.length}`);
    
    // Verificar se há duplicatas de CNPJ
    const cnpjMap = new Map();
    companies.forEach(company => {
      if (company.cnpj) {
        if (cnpjMap.has(company.cnpj)) {
          console.log(`\n⚠️ ALERTA: CNPJ duplicado encontrado: ${company.cnpj}`);
          console.log(`  - Empresa 1: ${cnpjMap.get(company.cnpj).name} (ID: ${cnpjMap.get(company.cnpj).id})`);
          console.log(`  - Empresa 2: ${company.name} (ID: ${company.id})`);
        } else {
          cnpjMap.set(company.cnpj, company);
        }
      }
    });
    
    // Listar todas as empresas
    console.log('\nLista de empresas:');
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} (ID: ${company.id})`);
      console.log(`   CNPJ: ${company.cnpj || 'Não informado'}`);
      console.log(`   Plano: ${company.planType}`);
      console.log(`   Status: ${company.isActive ? 'Ativo' : 'Inativo'}`);
      console.log(`   Criado em: ${company.createdAt.toISOString()}`);
      console.log('   ---');
    });
    
    // Fechar a conexão com o banco de dados
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
  }
}

// Executar a verificação
checkDatabaseConnections()
  .then(() => console.log('\nVerificação concluída!'))
  .catch(error => console.error('Erro durante a verificação:', error));
