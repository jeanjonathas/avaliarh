const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'pages/api/responses/index.ts');
console.log(`Aplicando hotfix no arquivo: ${filePath}`);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('Arquivo lido com sucesso');

  // Encontrar o bloco data e substituí-lo com uma abordagem mais simples
  const startIndex = content.indexOf('data: {');
  if (startIndex !== -1) {
    const endIndex = content.indexOf('},', startIndex);
    if (endIndex !== -1) {
      const replacement = `data: {
        candidateId: candidateId,
        questionId: response.questionId,
        optionId: response.optionId,
        questionText: question.text,
        optionText: option.text,
        isCorrectOption: option.isCorrect,
        stageName: question.Stage?.title || null,
        categoryName: question.Category?.name || null`;
      
      content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
      fs.writeFileSync(filePath, content);
      console.log('Hotfix aplicado com sucesso!');
    } else {
      console.error('Não foi possível encontrar o final do bloco data');
      process.exit(1);
    }
  } else {
    console.error('Não foi possível encontrar o bloco data');
    process.exit(1);
  }
} catch (error) {
  console.error('Erro ao aplicar hotfix:', error);
  process.exit(1);
}
