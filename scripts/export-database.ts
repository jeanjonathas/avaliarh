import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const prisma = new PrismaClient();

interface ExportOptions {
  format: 'sql' | 'json' | 'both';
  outputDir?: string;
  filename?: string;
  includeTimestamp?: boolean;
  prettyJson?: boolean;
}

async function exportDatabase(options: ExportOptions = { format: 'both', includeTimestamp: true, prettyJson: true }) {
  console.log('🚀 Iniciando exportação do banco de dados Admitto...');
  
  try {
    // Configurar diretório de saída
    const outputDir = options.outputDir || path.join(__dirname, '../exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Gerar nome do arquivo
    const timestamp = options.includeTimestamp 
      ? `_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss', { locale: ptBR })}`
      : '';
    
    const baseFilename = options.filename || `Admitto_export${timestamp}`;
    const sqlFilepath = path.join(outputDir, `${baseFilename}.sql`);
    const jsonFilepath = path.join(outputDir, `${baseFilename}.json`);
    
    // Coletar todos os dados
    console.log('📊 Coletando dados do banco...');
    const data = {
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
    
    // Exportar para SQL se solicitado
    if (options.format === 'sql' || options.format === 'both') {
      await exportToSQL(sqlFilepath, data);
      console.log(`✅ Exportação SQL concluída: ${sqlFilepath}`);
    }
    
    // Exportar para JSON se solicitado
    if (options.format === 'json' || options.format === 'both') {
      const jsonIndent = options.prettyJson ? 2 : 0;
      fs.writeFileSync(jsonFilepath, JSON.stringify(data, null, jsonIndent));
      console.log(`✅ Exportação JSON concluída: ${jsonFilepath}`);
    }
    
    // Gerar relatório de estatísticas
    const stats = generateStats(data);
    console.log('\n📈 Estatísticas da exportação:');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value} registros`);
    });
    
    return { 
      success: true, 
      sqlFilepath: options.format === 'sql' || options.format === 'both' ? sqlFilepath : null,
      jsonFilepath: options.format === 'json' || options.format === 'both' ? jsonFilepath : null,
      stats
    };
  } catch (error) {
    console.error('❌ Erro durante a exportação:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function exportToSQL(filepath: string, data: any) {
  const writeStream = fs.createWriteStream(filepath);
  
  // Escrever cabeçalho
  writeStream.write(`-- Admitto Database Export\n`);
  writeStream.write(`-- Data: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}\n`);
  writeStream.write(`-- Versão: 1.0.0\n\n`);
  writeStream.write(`-- Configuração inicial\n`);
  writeStream.write(`BEGIN;\n\n`);
  
  // Exportar cada modelo
  await exportModelToSQL(writeStream, 'User', data.users);
  await exportModelToSQL(writeStream, 'Admin', data.admins);
  await exportModelToSQL(writeStream, 'tests', data.tests);
  await exportModelToSQL(writeStream, 'Stage', data.stages);
  await exportModelToSQL(writeStream, 'TestStage', data.testStages);
  await exportModelToSQL(writeStream, 'Category', data.categories);
  await exportModelToSQL(writeStream, 'Question', data.questions);
  await exportModelToSQL(writeStream, 'Option', data.options);
  await exportModelToSQL(writeStream, 'StageQuestion', data.stageQuestions);
  await exportModelToSQL(writeStream, 'Candidate', data.candidates);
  await exportModelToSQL(writeStream, 'Response', data.responses);
  await exportModelToSQL(writeStream, 'UsedInviteCode', data.usedInviteCodes);
  
  // Finalizar transação
  writeStream.write(`COMMIT;\n`);
  writeStream.end();
  
  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });
}

async function exportModelToSQL(writeStream: fs.WriteStream, modelName: string, records: any[]) {
  if (records.length === 0) {
    writeStream.write(`-- Nenhum registro encontrado para ${modelName}\n\n`);
    return;
  }
  
  writeStream.write(`-- Exportando ${records.length} registros de ${modelName}\n`);
  
  // Para cada registro, gerar comando INSERT
  for (const record of records) {
    // Processar valores especiais (datas, booleanos, etc.)
    const processedRecord: Record<string, any> = {};
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

function generateStats(data: any) {
  return {
    Usuários: data.users.length,
    Administradores: data.admins.length,
    Testes: data.tests.length,
    Etapas: data.stages.length,
    'Associações Teste-Etapa': data.testStages.length,
    Categorias: data.categories.length,
    Perguntas: data.questions.length,
    Opções: data.options.length,
    'Associações Etapa-Pergunta': data.stageQuestions.length,
    Candidatos: data.candidates.length,
    Respostas: data.responses.length,
    'Códigos de Convite Usados': data.usedInviteCodes.length,
    Total: Object.values(data).reduce((acc: number, curr: any[]) => acc + curr.length, 0)
  };
}

// Função para exportar apenas um modelo específico
async function exportSingleModel(modelName: string, options: ExportOptions = { format: 'json' }) {
  console.log(`🔍 Exportando apenas o modelo: ${modelName}`);
  
  try {
    // Verificar se o modelo existe no Prisma
    if (!(prisma as any)[modelName.toLowerCase()]) {
      throw new Error(`Modelo "${modelName}" não encontrado no Prisma`);
    }
    
    // Buscar dados do modelo
    const records = await (prisma as any)[modelName.toLowerCase()].findMany();
    
    // Configurar diretório de saída
    const outputDir = options.outputDir || path.join(__dirname, '../exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Gerar nome do arquivo
    const timestamp = options.includeTimestamp 
      ? `_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss', { locale: ptBR })}`
      : '';
    
    const baseFilename = options.filename || `Admitto_${modelName.toLowerCase()}${timestamp}`;
    const filePath = path.join(outputDir, `${baseFilename}.${options.format}`);
    
    if (options.format === 'json') {
      const jsonIndent = options.prettyJson ? 2 : 0;
      fs.writeFileSync(filePath, JSON.stringify(records, null, jsonIndent));
    } else if (options.format === 'sql') {
      const writeStream = fs.createWriteStream(filePath);
      writeStream.write(`-- Admitto ${modelName} Export\n`);
      writeStream.write(`-- Data: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}\n\n`);
      writeStream.write(`BEGIN;\n\n`);
      await exportModelToSQL(writeStream, modelName, records);
      writeStream.write(`COMMIT;\n`);
      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });
    }
    
    console.log(`✅ Exportação de ${modelName} concluída: ${filePath}`);
    return { success: true, filePath, count: records.length };
  } catch (error) {
    console.error(`❌ Erro ao exportar ${modelName}:`, error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Exportar funções para uso externo
export { exportDatabase, exportSingleModel };

// Se executado diretamente via CLI
if (require.main === module) {
  // Analisar argumentos da linha de comando
  const args = process.argv.slice(2);
  const options: ExportOptions = { 
    format: 'both',
    includeTimestamp: true,
    prettyJson: true
  };
  
  // Verificar se há um modelo específico para exportar
  let singleModel = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format' && args[i+1]) {
      options.format = args[i+1] as any;
      i++;
    } else if (arg === '--output' && args[i+1]) {
      options.outputDir = args[i+1];
      i++;
    } else if (arg === '--filename' && args[i+1]) {
      options.filename = args[i+1];
      i++;
    } else if (arg === '--no-timestamp') {
      options.includeTimestamp = false;
    } else if (arg === '--compact') {
      options.prettyJson = false;
    } else if (arg === '--model' && args[i+1]) {
      singleModel = args[i+1];
      i++;
    } else if (arg === '--help') {
      console.log(`
Uso: ts-node export-database.ts [opções]

Opções:
  --format <formato>   Formato de exportação (sql, json, both) [padrão: both]
  --output <dir>       Diretório de saída [padrão: ../exports]
  --filename <nome>    Nome base do arquivo (sem extensão)
  --no-timestamp       Não incluir timestamp no nome do arquivo
  --compact            Gerar JSON compacto (sem indentação)
  --model <nome>       Exportar apenas um modelo específico
  --help               Exibir esta ajuda
      `);
      process.exit(0);
    }
  }
  
  if (singleModel) {
    exportSingleModel(singleModel, options).catch(e => {
      console.error('Erro fatal durante a exportação:', e);
      process.exit(1);
    });
  } else {
    exportDatabase(options).catch(e => {
      console.error('Erro fatal durante a exportação:', e);
      process.exit(1);
    });
  }
}
