// Script para exportar o banco de dados do AvaliaRH
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function exportDatabase() {
  console.log('Iniciando exportação do banco de dados...');
  
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
    await exportModel(writeStream, 'User', prisma.user);
    await exportModel(writeStream, 'Admin', prisma.admin);
    await exportModel(writeStream, 'tests', prisma.tests);
    await exportModel(writeStream, 'Stage', prisma.stage);
    await exportModel(writeStream, 'TestStage', prisma.testStage);
    await exportModel(writeStream, 'Category', prisma.category);
    await exportModel(writeStream, 'Question', prisma.question);
    await exportModel(writeStream, 'Option', prisma.option);
    await exportModel(writeStream, 'StageQuestion', prisma.stageQuestion);
    await exportModel(writeStream, 'Candidate', prisma.candidate);
    await exportModel(writeStream, 'Response', prisma.response);
    await exportModel(writeStream, 'UsedInviteCode', prisma.usedInviteCode);
    
    // Finalizar transação
    writeStream.write(`COMMIT;\n`);
    writeStream.end();
    
    console.log(`Exportação concluída com sucesso! Arquivo salvo em: ${filepath}`);
    
    // Exportar também como JSON para backup adicional
    const jsonFilepath = filepath.replace('.sql', '.json');
    const jsonData = {
      users: await prisma.user.findMany(),
      admins: await prisma.admin.findMany(),
      tests: await prisma.tests.findMany(),
      stages: await prisma.stage.findMany(),
      testStages: await prisma.testStage.findMany(),
      categories: await prisma.category.findMany(),
      questions: await prisma.question.findMany(),
      options: await prisma.option.findMany(),
      stageQuestions: await prisma.stageQuestion.findMany(),
      candidates: await prisma.candidate.findMany(),
      responses: await prisma.response.findMany(),
      usedInviteCodes: await prisma.usedInviteCode.findMany(),
    };
    
    fs.writeFileSync(jsonFilepath, JSON.stringify(jsonData, null, 2));
    console.log(`Backup JSON adicional salvo em: ${jsonFilepath}`);
    
    return { success: true, filepath, jsonFilepath };
  } catch (error) {
    console.error('Erro durante a exportação:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function exportModel(writeStream, modelName, model) {
  console.log(`Exportando dados do modelo: ${modelName}`);
  
  // Buscar todos os registros
  const records = await model.findMany();
  
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
exportDatabase().catch(e => {
  console.error('Erro fatal durante a exportação:', e);
  process.exit(1);
});
