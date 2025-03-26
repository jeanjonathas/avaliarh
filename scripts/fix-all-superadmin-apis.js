/**
 * Script para corrigir todas as APIs do SuperAdmin
 * 
 * Este script atualiza todos os arquivos de API do SuperAdmin para:
 * 1. Importar o singleton do Prisma corretamente
 * 2. Adicionar a função reconnectPrisma para garantir dados frescos
 * 3. Adicionar logs detalhados para monitorar o comportamento
 */

const fs = require('fs');
const path = require('path');

// Diretório base das APIs do SuperAdmin
const baseDir = path.join(process.cwd(), 'pages/api/superadmin');

// Função para processar um arquivo
function processFile(filePath) {
  console.log(`Processando: ${filePath}`);
  
  // Ler o conteúdo do arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Verificar se o arquivo já foi atualizado
  if (content.includes('reconnectPrisma')) {
    console.log(`  Arquivo já atualizado, pulando...`);
    return;
  }
  
  // Criar backup do arquivo original
  const backupPath = `${filePath}.bak`;
  fs.writeFileSync(backupPath, content);
  console.log(`  Backup criado: ${backupPath}`);
  
  // Substituir importação do Prisma
  if (content.includes("import { prisma } from '@/lib/prisma'")) {
    content = content.replace(
      "import { prisma } from '@/lib/prisma'",
      "import { prisma, reconnectPrisma } from '@/lib/prisma'"
    );
    console.log(`  Importação do Prisma atualizada`);
  } else if (content.includes("import { PrismaClient }")) {
    content = content.replace(
      "import { PrismaClient }",
      "import { prisma, reconnectPrisma } from '@/lib/prisma';\n// import { PrismaClient }"
    );
    
    // Remover instanciação direta do PrismaClient
    content = content.replace(
      /const\s+prisma\s*=\s*new\s+PrismaClient\([^)]*\)/g,
      "// Usando singleton do Prisma importado de @/lib/prisma"
    );
    
    console.log(`  Substituída instanciação direta do PrismaClient pelo singleton`);
  }
  
  // Adicionar reconexão do Prisma em funções de busca
  const findManyPattern = /await\s+prisma\.[a-zA-Z]+\.findMany/g;
  const findManyMatches = content.match(findManyPattern);
  
  if (findManyMatches) {
    findManyMatches.forEach(match => {
      const entityName = match.split('.')[1];
      const logPrefix = entityName.toUpperCase();
      
      // Adicionar log e reconexão antes da consulta
      const replacement = `
    console.log(\`[${logPrefix}] Iniciando busca de ${entityName} (\${new Date().toISOString()})\`);
    
    // Forçar desconexão e reconexão para garantir dados frescos
    await reconnectPrisma();
    
    ${match}`;
      
      // Substituir apenas a primeira ocorrência de cada match
      content = content.replace(match, replacement);
    });
    
    console.log(`  Adicionada reconexão do Prisma em ${findManyMatches.length} consultas`);
  }
  
  // Adicionar desconexão no final das funções
  if (content.includes('return res.status(200).json(')) {
    content = content.replace(
      /return res\.status\(200\)\.json\(([^)]+)\);/g,
      (match, group) => {
        return `
    // Desconectar Prisma após a consulta
    console.log(\`[API] Finalizando requisição, desconectando Prisma (\${new Date().toISOString()})\`);
    await prisma.$disconnect();
    
    return res.status(200).json(${group});`;
      }
    );
    
    console.log(`  Adicionada desconexão do Prisma no final das funções`);
  }
  
  // Salvar o arquivo atualizado
  fs.writeFileSync(filePath, content);
  console.log(`  Arquivo atualizado com sucesso!`);
}

// Função para processar um diretório recursivamente
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.ts')) {
      processFile(filePath);
    }
  });
}

// Iniciar o processamento
console.log('Iniciando correção de todas as APIs do SuperAdmin...');
processDirectory(baseDir);
console.log('Processo concluído!');
