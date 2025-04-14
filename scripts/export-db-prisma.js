/**
 * Script para exportar dados do banco de desenvolvimento para SQL
 * 
 * Este script usa o Prisma para ler todos os dados do banco local
 * e gerar um arquivo SQL que pode ser importado no ambiente de produção.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Inicializar o cliente Prisma
const prisma = new PrismaClient();

// Nome do arquivo de saída
const outputFile = path.join(__dirname, '..', 'avaliarh_export.sql');

// Função para escapar strings para SQL
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val;
  if (val instanceof Date) return `'${val.toISOString()}'`;
  
  // Escapar aspas simples em strings
  return `'${val.toString().replace(/'/g, "''")}'`;
}

// Função para gerar INSERT para uma tabela
async function generateInsert(modelName, columns, data) {
  if (data.length === 0) return '';
  
  const tableName = modelName;
  const columnStr = columns.map(col => `"${col}"`).join(', ');
  
  let insertSql = `-- Dados da tabela ${tableName}\n`;
  insertSql += `INSERT INTO "${tableName}" (${columnStr}) VALUES\n`;
  
  const rows = data.map(item => {
    const values = columns.map(col => {
      let val = item[col];
      return escapeSql(val);
    });
    return `(${values.join(', ')})`;
  });
  
  insertSql += rows.join(',\n') + ';\n\n';
  return insertSql;
}

// Função principal para exportar todos os dados
async function exportAllData() {
  console.log('Iniciando exportação do banco de dados...');
  
  try {
    // Cabeçalho do arquivo SQL
    let sqlContent = `-- Script de migração do banco de dados AvaliaRH
-- Gerado em ${new Date().toISOString()}

-- Desabilitar restrições de chave estrangeira
SET session_replication_role = replica;

-- Limpar tabelas existentes
TRUNCATE TABLE "Response" CASCADE;
TRUNCATE TABLE "UsedInviteCode" CASCADE;
TRUNCATE TABLE "Option" CASCADE;
TRUNCATE TABLE "StageQuestion" CASCADE;
TRUNCATE TABLE "Question" CASCADE;
TRUNCATE TABLE "TestStage" CASCADE;
TRUNCATE TABLE "Stage" CASCADE;
TRUNCATE TABLE "Test" CASCADE;
TRUNCATE TABLE "Candidate" CASCADE;
TRUNCATE TABLE "Category" CASCADE;
TRUNCATE TABLE "Admin" CASCADE;
TRUNCATE TABLE "User" CASCADE;

`;

    // Exportar usuários
    console.log('Exportando usuários...');
    const users = await prisma.user.findMany();
    sqlContent += await generateInsert('User', 
      ['id', 'name', 'email', 'password', 'role', 'createdAt', 'updatedAt'], 
      users);

    // Exportar administradores
    console.log('Exportando administradores...');
    const admins = await prisma.admin.findMany();
    sqlContent += await generateInsert('Admin', 
      ['id', 'name', 'email', 'password', 'company', 'position', 'phone', 'createdAt', 'updatedAt'], 
      admins);

    // Exportar categorias
    console.log('Exportando categorias...');
    const categories = await prisma.category.findMany();
    sqlContent += await generateInsert('Category', 
      ['id', 'name', 'description', 'createdAt', 'updatedAt'], 
      categories);

    // Exportar testes
    console.log('Exportando testes...');
    const tests = await prisma.test.findMany();
    sqlContent += await generateInsert('Test', 
      ['id', 'title', 'description', 'timeLimit', 'active', 'createdAt', 'updatedAt'], 
      tests);

    // Exportar etapas
    console.log('Exportando etapas...');
    const stages = await prisma.stage.findMany();
    sqlContent += await generateInsert('Stage', 
      ['id', 'title', 'description', 'timeLimit', 'order', 'createdAt', 'updatedAt'], 
      stages);

    // Exportar relações entre testes e etapas
    console.log('Exportando relações entre testes e etapas...');
    const testStages = await prisma.testStage.findMany();
    sqlContent += await generateInsert('TestStage', 
      ['id', 'testId', 'stageId', 'order', 'createdAt', 'updatedAt'], 
      testStages);

    // Exportar questões
    console.log('Exportando questões...');
    const questions = await prisma.question.findMany();
    sqlContent += await generateInsert('Question', 
      ['id', 'text', 'type', 'points', 'categoryId', 'createdAt', 'updatedAt'], 
      questions);

    // Exportar relações entre etapas e questões
    console.log('Exportando relações entre etapas e questões...');
    const stageQuestions = await prisma.stageQuestion.findMany();
    sqlContent += await generateInsert('StageQuestion', 
      ['id', 'stageId', 'questionId', 'order', 'createdAt', 'updatedAt'], 
      stageQuestions);

    // Exportar opções
    console.log('Exportando opções...');
    const options = await prisma.option.findMany();
    sqlContent += await generateInsert('Option', 
      ['id', 'text', 'isCorrect', 'questionId', 'createdAt', 'updatedAt'], 
      options);

    // Exportar candidatos
    console.log('Exportando candidatos...');
    const candidates = await prisma.candidate.findMany();
    sqlContent += await generateInsert('Candidate', 
      ['id', 'name', 'email', 'phone', 'position', 'testDate', 'completed', 'createdAt', 'updatedAt', 
       'infoJobsLink', 'interviewDate', 'observations', 'rating', 'resumeFile', 'socialMediaUrl', 
       'status', 'inviteCode', 'inviteSent'], 
      candidates);

    // Exportar códigos de convite usados
    console.log('Exportando códigos de convite usados...');
    const usedInviteCodes = await prisma.usedInviteCode.findMany();
    sqlContent += await generateInsert('UsedInviteCode', 
      ['id', 'code', 'usedAt', 'candidateId'], 
      usedInviteCodes);

    // Exportar respostas
    console.log('Exportando respostas...');
    const responses = await prisma.response.findMany();
    sqlContent += await generateInsert('Response', 
      ['id', 'candidateId', 'questionId', 'optionId', 'text', 'createdAt', 'updatedAt'], 
      responses);

    // Reabilitar restrições de chave estrangeira
    sqlContent += `-- Reabilitar restrições de chave estrangeira
SET session_replication_role = DEFAULT;

-- Migração concluída
`;

    // Escrever o conteúdo no arquivo
    fs.writeFileSync(outputFile, sqlContent);
    
    console.log(`Exportação concluída! Arquivo salvo em: ${outputFile}`);
    console.log('\nPara importar no ambiente de produção:');
    console.log('1. Transfira o arquivo para o seu VPS');
    console.log('2. Execute o comando:');
    console.log('   docker exec -i $(docker ps | grep postgres | awk \'{print $1}\') psql -U postgres -d avaliacao_candidatos -f avaliarh_export.sql');
    console.log('\nOu, se estiver usando Docker Swarm:');
    console.log('   docker service ls # para encontrar o serviço do postgres');
    console.log('   docker service ps <nome_do_serviço_postgres> # para encontrar o container');
    console.log('   docker exec -i <container_id> psql -U postgres -d avaliacao_candidatos -f avaliarh_export.sql');
    
  } catch (error) {
    console.error('Erro durante a exportação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
exportAllData();
