/**
 * Script para encontrar possíveis erros de void em arquivos de API do SuperAdmin
 * 
 * Este script analisa todos os arquivos de API do SuperAdmin para encontrar
 * padrões que podem causar erros de tipagem 'void' durante a compilação.
 */

const fs = require('fs');
const path = require('path');

// Diretório base das APIs do SuperAdmin
const baseDir = path.join(process.cwd(), 'pages/api/superadmin');

// Função para analisar um arquivo
function analyzeFile(filePath) {
  console.log(`Analisando: ${filePath}`);
  
  // Ler o conteúdo do arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Dividir o conteúdo em linhas
  const lines = content.split('\n');
  
  // Procurar por padrões problemáticos
  for (let i = 0; i < lines.length; i++) {
    // Padrão 1: Declaração de variável seguida por console.log e await prisma sem atribuição
    if (lines[i].includes('const ') && lines[i].includes(' = ') && 
        i + 3 < lines.length && 
        (lines[i+1].includes('console.log') || lines[i+1].trim() === '') && 
        (lines[i+2].includes('await reconnectPrisma') || lines[i+2].trim() === '') && 
        lines[i+3].includes('await prisma.')) {
      
      console.log(`  ERRO POTENCIAL (Padrão 1) na linha ${i+1}:`);
      console.log(`    ${lines[i].trim()}`);
      console.log(`    ${lines[i+1].trim()}`);
      console.log(`    ${lines[i+2].trim()}`);
      console.log(`    ${lines[i+3].trim()}`);
      console.log('');
    }
    
    // Padrão 2: Uso de uma variável que pode ser void
    if ((lines[i].includes('.map(') || 
         lines[i].includes('.filter(') || 
         lines[i].includes('.forEach(') || 
         lines[i].includes('.find(') || 
         lines[i].includes(' || []')) && 
        !lines[i].includes('await ')) {
      
      // Extrair o nome da variável
      const match = lines[i].match(/(\w+)\.(map|filter|forEach|find)/);
      if (match) {
        const varName = match[1];
        
        // Procurar pela declaração da variável
        let foundDeclaration = false;
        for (let j = Math.max(0, i - 20); j < i; j++) {
          if (lines[j].includes(`const ${varName} = `) && 
              !lines[j].includes('await') && 
              (j + 1 < lines.length && 
               (lines[j+1].includes('console.log') || 
                (j + 2 < lines.length && lines[j+2].includes('await prisma'))))) {
            
            console.log(`  ERRO POTENCIAL (Padrão 2) na linha ${i+1}:`);
            console.log(`    Declaração: ${lines[j].trim()}`);
            console.log(`    Uso: ${lines[i].trim()}`);
            console.log('');
            foundDeclaration = true;
            break;
          }
        }
        
        if (!foundDeclaration && lines[i].includes(' || []')) {
          const nullMatch = lines[i].match(/(\w+)\s+\|\|\s+\[\]/);
          if (nullMatch) {
            const nullVarName = nullMatch[1];
            
            // Procurar pela declaração da variável
            for (let j = Math.max(0, i - 20); j < i; j++) {
              if (lines[j].includes(`const ${nullVarName} = `) && 
                  !lines[j].includes('await') && 
                  (j + 1 < lines.length && lines[j+1].includes('console.log'))) {
                
                console.log(`  ERRO POTENCIAL (Padrão 3) na linha ${i+1}:`);
                console.log(`    Declaração: ${lines[j].trim()}`);
                console.log(`    Uso: ${lines[i].trim()}`);
                console.log('');
                break;
              }
            }
          }
        }
      }
    }
    
    // Padrão 3: Declaração de variável seguida diretamente por await prisma sem atribuição
    if (lines[i].includes('const ') && lines[i].includes(' = ') && 
        i + 1 < lines.length && 
        lines[i+1].includes('await prisma.') && 
        !lines[i].includes('await')) {
      
      console.log(`  ERRO POTENCIAL (Padrão 3) na linha ${i+1}:`);
      console.log(`    ${lines[i].trim()}`);
      console.log(`    ${lines[i+1].trim()}`);
      console.log('');
    }
    
    // Padrão 4: await prisma sem atribuição
    if (lines[i].trim().startsWith('await prisma.') && 
        !lines[i-1].includes('const ') && 
        !lines[i-1].includes(' = ')) {
      
      console.log(`  ERRO POTENCIAL (Padrão 4) na linha ${i+1}:`);
      console.log(`    ${lines[i].trim()}`);
      console.log('');
    }
  }
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
      analyzeFile(filePath);
    }
  });
}

// Iniciar o processamento
console.log('Iniciando análise de arquivos para encontrar erros de void...');
processDirectory(baseDir);
console.log('Análise concluída!');
