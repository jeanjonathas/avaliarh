const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'pages/api/admin/candidates/[id].ts');
console.log(`Aplicando hotfix no arquivo: ${filePath}`);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Arquivo lido com sucesso');

  // Correção 1: Garantir que o acesso a stageId seja seguro
  content = content.replace(
    /const stageId = response\.question\.stageId;/g,
    'const stageId = response.question?.stageId || "unknown";'
  );

  // Correção 2: Verificação segura de propriedades antes de acessá-las
  content = content.replace(
    /if \(response\.option\.isCorrect\) {/g,
    'if (response.option && response.option.isCorrect) {'
  );

  // Correção 3: Verificação de null/undefined antes de acessar propriedades
  content = content.replace(
    /candidate\.responses\.forEach\(response => {/g,
    'candidate.responses && candidate.responses.forEach(response => {'
  );

  // Correção 4: Garantir que o objeto response.question exista antes de acessá-lo
  content = content.replace(
    /const stageId = response\.question\?.stageId \|\| "unknown";/g,
    'const stageId = (response.question && response.question.stageId) ? response.question.stageId : "unknown";'
  );

  // Correção 5: Verificação adicional para o cálculo de pontuação
  content = content.replace(
    /const totalCorrect = candidate\.responses\.filter\(r => r\.option\.isCorrect\)\.length;/g,
    'const totalCorrect = candidate.responses ? candidate.responses.filter(r => r && r.option && r.option.isCorrect).length : 0;'
  );

  fs.writeFileSync(filePath, content);
  console.log('Hotfix aplicado com sucesso!');
} catch (error) {
  console.error('Erro ao aplicar hotfix:', error);
  process.exit(1);
}
