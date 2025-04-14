// Script para exportar o banco de dados do AvaliaRH para SQL
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportDatabaseToSQL() {
  console.log('Iniciando exportação do banco de dados para SQL...');
  
  try {
    // Criar diretório de exportação se não existir
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `avaliarh_export_${timestamp}.sql`;
    const filepath = path.join(exportDir, filename);
    
    // Abrir stream para escrita
    const writeStream = fs.createWriteStream(filepath);
    
    // Escrever cabeçalho
    writeStream.write(`-- AvaliaRH Database Export\n`);
    writeStream.write(`-- Date: ${new Date().toISOString()}\n\n`);
    writeStream.write(`-- Configuração inicial\n`);
    writeStream.write(`BEGIN;\n\n`);
    
    // Exportar dados de cada modelo
    await exportModelToSQL(writeStream, 'User', await prisma.user.findMany());
    await exportModelToSQL(writeStream, 'Admin', await prisma.admin.findMany());
    await exportModelToSQL(writeStream, 'tests', await prisma.tests.findMany());
    await exportModelToSQL(writeStream, 'Stage', await prisma.stage.findMany());
    await exportModelToSQL(writeStream, 'TestStage', await prisma.testStage.findMany());
    await exportModelToSQL(writeStream, 'Category', await prisma.category.findMany());
    await exportModelToSQL(writeStream, 'Question', await prisma.question.findMany());
    await exportModelToSQL(writeStream, 'Option', await prisma.option.findMany());
    await exportModelToSQL(writeStream, 'StageQuestion', await prisma.stageQuestion.findMany());
    await exportModelToSQL(writeStream, 'Candidate', await prisma.candidate.findMany());
    await exportModelToSQL(writeStream, 'Response', await prisma.response.findMany());
    await exportModelToSQL(writeStream, 'UsedInviteCode', await prisma.usedInviteCode.findMany());
    
    // Finalizar transação
    writeStream.write(`COMMIT;\n`);
    writeStream.end();
    
    console.log(`Exportação concluída com sucesso! Arquivo salvo em: ${filepath}`);
    return { success: true, filepath };
  } catch (error) {
    console.error('Erro durante a exportação:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function exportModelToSQL(writeStream, modelName, records) {
  console.log(`Exportando dados do modelo: ${modelName}`);
  
  if (records.length === 0) {
    writeStream.write(`-- Nenhum registro encontrado para ${modelName}\n\n`);
    return;
  }
  
  writeStream.write(`-- Exportando ${records.length} registros de ${modelName}\n`);
  
  // Para cada registro, gerar comando INSERT
  for (const record of records) {
    // Converter datas para formato ISO
    const processedRecord = {};
    for (const [key, value] of Object.entries(record)) {
      if (value instanceof Date) {
        processedRecord[key] = value.toISOString();
      } else {
        processedRecord[key] = value;
      }
    }
    
    // Gerar colunas e valores
    const columns = Object.keys(processedRecord).join('", "');
    const values = Object.values(processedRecord)
      .map(val => {
        if (val === null) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val;
        return `'${val.toString().replace(/'/g, "''")}'`;
      })
      .join(', ');
    
    writeStream.write(`INSERT INTO "${modelName}" ("${columns}") VALUES (${values});\n`);
  }
  
  writeStream.write('\n');
}

// Executar a exportação
exportDatabaseToSQL().catch(e => {
  console.error('Erro fatal durante a exportação:', e);
  process.exit(1);
});
