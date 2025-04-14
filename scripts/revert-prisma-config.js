const fs = require('fs');
const path = require('path');

// Função para encontrar todos os arquivos JS/TS em um diretório recursivamente
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      fileList = findJsFiles(filePath, fileList);
    } else if (
      stat.isFile() && 
      (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) &&
      !file.includes('.d.ts')
    ) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Função para corrigir um arquivo
function fixFile(filePath) {
  console.log(`Verificando: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Padrão para encontrar inicializações do PrismaClient com configuração __internal
  const pattern = /new PrismaClient\(\{\s*__internal:\s*\{\s*enableTracing:\s*false\s*\}\s*\}\)/g;
  
  if (pattern.test(content)) {
    console.log(`  Corrigindo: ${filePath}`);
    
    // Substituir por inicialização padrão
    const correctedContent = content.replace(pattern, 'new PrismaClient()');
    
    // Salvar o arquivo corrigido
    fs.writeFileSync(filePath, correctedContent, 'utf8');
    console.log(`  Arquivo corrigido: ${filePath}`);
    return true;
  }
  
  return false;
}

// Diretório raiz do projeto
const rootDir = path.resolve(__dirname, '..');
console.log(`Diretório raiz: ${rootDir}`);

// Encontrar todos os arquivos JS/TS
const jsFiles = findJsFiles(rootDir);
console.log(`Encontrados ${jsFiles.length} arquivos JS/TS para verificar`);

// Corrigir cada arquivo
let fixedCount = 0;
jsFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\nTotal de arquivos corrigidos: ${fixedCount}`);
console.log('Processo concluído!');
