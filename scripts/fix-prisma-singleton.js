const fs = require('fs');
const path = require('path');

// Diretório base para os arquivos da API
const baseDir = path.join(__dirname, '..', 'pages', 'api');

// Função para encontrar todos os arquivos .ts recursivamente
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Função para substituir a instanciação direta do PrismaClient pelo padrão singleton
function replacePrismaClient(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verifica se o arquivo usa PrismaClient diretamente
    if (content.includes('new PrismaClient')) {
      console.log(`Processando: ${filePath}`);
      
      // Substitui a importação do PrismaClient
      content = content.replace(
        /import\s*{\s*PrismaClient\s*}\s*from\s*['"]@prisma\/client['"];?/,
        `import { prisma } from '@/lib/prisma';`
      );
      
      // Remove a linha que instancia o PrismaClient
      content = content.replace(
        /const\s+prisma\s*=\s*new\s+PrismaClient\(\s*\)\s*;?/g,
        ''
      );
      
      // Salva o arquivo modificado
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error);
    return false;
  }
}

// Função principal
function main() {
  console.log('Iniciando correção do padrão singleton do Prisma Client em toda a aplicação...');
  
  // Encontra todos os arquivos .ts
  const tsFiles = findTsFiles(baseDir);
  console.log(`Encontrados ${tsFiles.length} arquivos .ts para verificação`);
  
  // Processa cada arquivo
  let correctedCount = 0;
  tsFiles.forEach(file => {
    if (replacePrismaClient(file)) {
      correctedCount++;
    }
  });
  
  console.log(`\nResumo:`);
  console.log(`Total de arquivos verificados: ${tsFiles.length}`);
  console.log(`Total de arquivos corrigidos: ${correctedCount}`);
  console.log('Processo concluído!');
}

// Executa a função principal
main();
