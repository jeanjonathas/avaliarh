const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Diretório para armazenar o arquivo de versão
const versionDir = path.join(__dirname, '..', 'src', 'version');

// Garantir que o diretório existe
if (!fs.existsSync(versionDir)) {
  fs.mkdirSync(versionDir, { recursive: true });
}

try {
  // Obter o hash do commit atual
  const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  
  // Obter a branch atual
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  
  // Obter a data do último commit
  const commitDate = execSync('git log -1 --format=%cd --date=short').toString().trim();
  
  // Obter a mensagem do último commit
  const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
  
  // Criar objeto de versão
  const versionInfo = {
    commitHash,
    branch,
    commitDate,
    commitMessage,
    buildDate: new Date().toISOString(),
  };
  
  // Escrever para um arquivo JavaScript que exporta o objeto
  const versionFilePath = path.join(versionDir, 'index.js');
  fs.writeFileSync(
    versionFilePath,
    `// Gerado automaticamente em ${new Date().toISOString()}\n` +
    `module.exports = ${JSON.stringify(versionInfo, null, 2)};\n`
  );
  
  console.log(`Informações de versão geradas em: ${versionFilePath}`);
  console.log(`Commit: ${commitHash} (${branch})`);
  console.log(`Data: ${commitDate}`);
  console.log(`Mensagem: ${commitMessage}`);
} catch (error) {
  console.error('Erro ao gerar informações de versão:', error);
  
  // Em caso de erro (por exemplo, não estar em um repositório git),
  // criar um arquivo com informações padrão
  const fallbackInfo = {
    commitHash: 'desconhecido',
    branch: 'desconhecido',
    commitDate: new Date().toISOString().split('T')[0],
    commitMessage: 'Informação não disponível',
    buildDate: new Date().toISOString(),
  };
  
  const versionFilePath = path.join(versionDir, 'index.js');
  fs.writeFileSync(
    versionFilePath,
    `// Gerado automaticamente em ${new Date().toISOString()} (fallback)\n` +
    `module.exports = ${JSON.stringify(fallbackInfo, null, 2)};\n`
  );
  
  console.log(`Informações de versão padrão geradas em: ${versionFilePath}`);
}
