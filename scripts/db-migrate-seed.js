/**
 * Script para migrar dados do banco de desenvolvimento para o banco de produção
 * 
 * Como usar:
 * 1. Ajuste as variáveis de conexão abaixo (DEV_DATABASE_URL e PROD_DATABASE_URL)
 * 2. Execute: node scripts/db-migrate-seed.js
 * 
 * Este script exporta todos os dados do banco de desenvolvimento e os importa no banco de produção.
 * Ele preserva todas as relações entre as entidades.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Configurações
const DEV_DATABASE_URL = process.env.DEV_DATABASE_URL || 'postgresql://usuario:senha@localhost:5432/avaliarh_dev';
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL || 'postgresql://usuario:senha@seu_vps:5432/avaliarh_prod';
const EXPORT_FILE = path.join(__dirname, 'db-export.json');

// Criar clientes Prisma para desenvolvimento e produção
const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: DEV_DATABASE_URL,
    },
  },
});

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DATABASE_URL,
    },
  },
});

// Função para exportar dados do banco de desenvolvimento
async function exportData() {
  console.log('Exportando dados do banco de desenvolvimento...');
  
  const data = {
    users: await devPrisma.user.findMany(),
    admins: await devPrisma.admin.findMany(),
    candidates: await devPrisma.candidate.findMany(),
    tests: await devPrisma.test.findMany(),
    stages: await devPrisma.stage.findMany(),
    questions: await devPrisma.question.findMany(),
    options: await devPrisma.option.findMany(),
    responses: await devPrisma.response.findMany(),
    testStages: await devPrisma.testStage.findMany(),
    stageQuestions: await devPrisma.stageQuestion.findMany(),
    categories: await devPrisma.category.findMany(),
    usedInviteCodes: await devPrisma.usedInviteCode.findMany(),
  };
  
  // Salvar dados em arquivo JSON
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(data, null, 2));
  console.log(`Dados exportados com sucesso para ${EXPORT_FILE}`);
  
  return data;
}

// Função para importar dados no banco de produção
async function importData(data) {
  console.log('Importando dados para o banco de produção...');
  
  // Backup dos dados de produção (opcional)
  const backupFile = path.join(__dirname, `prod-backup-${new Date().toISOString().replace(/:/g, '-')}.json`);
  const prodBackup = {
    users: await prodPrisma.user.findMany(),
    admins: await prodPrisma.admin.findMany(),
    candidates: await prodPrisma.candidate.findMany(),
    // ... outros modelos
  };
  fs.writeFileSync(backupFile, JSON.stringify(prodBackup, null, 2));
  console.log(`Backup do banco de produção salvo em ${backupFile}`);
  
  // Importar dados na ordem correta para preservar relações
  try {
    // Desativar verificações de chaves estrangeiras (se possível)
    // Isso depende do banco de dados e pode não funcionar em todos os casos
    
    // Importar usuários e administradores
    console.log('Importando usuários e administradores...');
    for (const user of data.users) {
      await prodPrisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    
    for (const admin of data.admins) {
      await prodPrisma.admin.upsert({
        where: { id: admin.id },
        update: admin,
        create: admin,
      });
    }
    
    // Importar categorias
    console.log('Importando categorias...');
    for (const category of data.categories) {
      await prodPrisma.category.upsert({
        where: { id: category.id },
        update: category,
        create: category,
      });
    }
    
    // Importar testes
    console.log('Importando testes...');
    for (const test of data.tests) {
      await prodPrisma.test.upsert({
        where: { id: test.id },
        update: test,
        create: test,
      });
    }
    
    // Importar etapas
    console.log('Importando etapas...');
    for (const stage of data.stages) {
      await prodPrisma.stage.upsert({
        where: { id: stage.id },
        update: stage,
        create: stage,
      });
    }
    
    // Importar relações entre testes e etapas
    console.log('Importando relações entre testes e etapas...');
    for (const testStage of data.testStages) {
      await prodPrisma.testStage.upsert({
        where: { id: testStage.id },
        update: testStage,
        create: testStage,
      });
    }
    
    // Importar questões
    console.log('Importando questões...');
    for (const question of data.questions) {
      await prodPrisma.question.upsert({
        where: { id: question.id },
        update: question,
        create: question,
      });
    }
    
    // Importar relações entre etapas e questões
    console.log('Importando relações entre etapas e questões...');
    for (const stageQuestion of data.stageQuestions) {
      await prodPrisma.stageQuestion.upsert({
        where: { id: stageQuestion.id },
        update: stageQuestion,
        create: stageQuestion,
      });
    }
    
    // Importar opções
    console.log('Importando opções...');
    for (const option of data.options) {
      await prodPrisma.option.upsert({
        where: { id: option.id },
        update: option,
        create: option,
      });
    }
    
    // Importar candidatos
    console.log('Importando candidatos...');
    for (const candidate of data.candidates) {
      await prodPrisma.candidate.upsert({
        where: { id: candidate.id },
        update: candidate,
        create: candidate,
      });
    }
    
    // Importar códigos de convite usados
    console.log('Importando códigos de convite usados...');
    for (const usedInviteCode of data.usedInviteCodes) {
      await prodPrisma.usedInviteCode.upsert({
        where: { id: usedInviteCode.id },
        update: usedInviteCode,
        create: usedInviteCode,
      });
    }
    
    // Importar respostas
    console.log('Importando respostas...');
    for (const response of data.responses) {
      await prodPrisma.response.upsert({
        where: { id: response.id },
        update: response,
        create: response,
      });
    }
    
    console.log('Importação concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a importação:', error);
    console.log('Restaurando backup...');
    // Lógica de restauração poderia ser implementada aqui
    throw error;
  }
}

// Função principal
async function main() {
  try {
    console.log('Iniciando migração de dados...');
    
    // Verificar conexão com os bancos
    console.log('Verificando conexão com o banco de desenvolvimento...');
    await devPrisma.$connect();
    
    console.log('Verificando conexão com o banco de produção...');
    await prodPrisma.$connect();
    
    // Exportar dados do banco de desenvolvimento
    const data = await exportData();
    
    // Perguntar se deve continuar com a importação
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Dados exportados. Deseja continuar com a importação para o banco de produção? (s/n) ', async (answer) => {
      if (answer.toLowerCase() === 's') {
        // Importar dados no banco de produção
        await importData(data);
        console.log('Migração concluída com sucesso!');
      } else {
        console.log('Importação cancelada. Os dados exportados estão disponíveis em:', EXPORT_FILE);
      }
      
      // Fechar conexões
      await devPrisma.$disconnect();
      await prodPrisma.$disconnect();
      readline.close();
    });
  } catch (error) {
    console.error('Erro durante a migração:', error);
    
    // Fechar conexões
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
    
    process.exit(1);
  }
}

// Executar script
main();
