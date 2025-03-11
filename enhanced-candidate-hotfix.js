const fs = require('fs');
const path = require('path');

// Aplicar hotfix ao arquivo da API de candidatos
const apiFilePath = path.join(process.cwd(), 'pages/api/admin/candidates/[id].ts');
console.log(`Aplicando hotfix no arquivo da API: ${apiFilePath}`);

try {
  let apiContent = fs.readFileSync(apiFilePath, 'utf8');
  console.log('Arquivo da API lido com sucesso');

  // Correção 1: Garantir que o acesso a stageId seja seguro
  apiContent = apiContent.replace(
    /const stageId = response\.question\.stageId;/g,
    'const stageId = response?.question?.stageId || "unknown";'
  );

  // Correção 2: Verificação segura de propriedades antes de acessá-las
  apiContent = apiContent.replace(
    /if \(response\.option\.isCorrect\) {/g,
    'if (response?.option?.isCorrect) {'
  );

  // Correção 3: Verificação de null/undefined antes de acessar propriedades
  apiContent = apiContent.replace(
    /candidate\.responses\.forEach\(response => {/g,
    'candidate?.responses?.forEach(response => {'
  );

  // Correção 4: Garantir que o objeto response.question exista antes de acessá-lo
  apiContent = apiContent.replace(
    /const stageId = response\.question\?.stageId \|\| "unknown";/g,
    'const stageId = (response?.question?.stageId) ? response.question.stageId : "unknown";'
  );

  // Correção 5: Verificação adicional para o cálculo de pontuação
  apiContent = apiContent.replace(
    /const totalCorrect = candidate\.responses\.filter\(r => r\.option\.isCorrect\)\.length;/g,
    'const totalCorrect = candidate?.responses ? candidate.responses.filter(r => r?.option?.isCorrect).length : 0;'
  );

  // Correção 6: Garantir que todos os campos obrigatórios estejam presentes no objeto serializado
  apiContent = apiContent.replace(
    /const serializedCandidate = convertBigIntToNumber\({/g,
    `const serializedCandidate = convertBigIntToNumber({
      // Garantir que todos os campos obrigatórios estejam presentes
      id: formattedCandidate.id || '',
      name: formattedCandidate.name || '',
      email: formattedCandidate.email || '',
      status: formattedCandidate.status || 'PENDING',
      completed: formattedCandidate.completed || false,
      createdAt: formattedCandidate.createdAt || new Date().toISOString(),
      updatedAt: formattedCandidate.updatedAt || new Date().toISOString(),
      testDate: formattedCandidate.testDate || null,`
  );

  // Correção 7: Adicionar tratamento de erro para candidatos não encontrados
  apiContent = apiContent.replace(
    /if \(!candidate\) {/g,
    `console.log('Verificando se o candidato existe...');
    if (!candidate) {
      console.error('Candidato não encontrado com ID:', id);`
  );

  // Correção 8: Adicionar log detalhado para depuração
  apiContent = apiContent.replace(
    /return res\.status\(200\)\.json\(serializedCandidate\);/g,
    `console.log('Enviando resposta com candidato serializado');
    console.log('Campos principais do candidato:', {
      id: serializedCandidate.id,
      name: serializedCandidate.name,
      email: serializedCandidate.email,
      status: serializedCandidate.status,
      respostas: serializedCandidate.responses ? serializedCandidate.responses.length : 0
    });
    return res.status(200).json(serializedCandidate);`
  );

  fs.writeFileSync(apiFilePath, apiContent);
  console.log('Hotfix da API aplicado com sucesso!');

  // Aplicar hotfix ao arquivo de frontend
  const frontendFilePath = path.join(process.cwd(), 'pages/admin/candidate/[id].tsx');
  console.log(`Aplicando hotfix no arquivo de frontend: ${frontendFilePath}`);
  
  let frontendContent = fs.readFileSync(frontendFilePath, 'utf8');
  console.log('Arquivo de frontend lido com sucesso');

  // Correção 1: Melhorar a validação de dados no frontend
  frontendContent = frontendContent.replace(
    /setCandidate\(data\);/g,
    `// Garantir que todos os campos necessários existam
    const safeData = {
      ...data,
      responses: Array.isArray(data.responses) ? data.responses : [],
      stageScores: Array.isArray(data.stageScores) ? data.stageScores : []
    };
    console.log('Dados do candidato processados com segurança');
    setCandidate(safeData);`
  );

  // Correção 2: Adicionar verificação de segurança nas renderizações
  const renderSafetyCheck = `
  // Verificar se o candidato existe antes de renderizar
  if (!candidate && !loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar candidato</h1>
            <p className="text-gray-700 mb-4">
              Não foi possível carregar os dados do candidato. O candidato pode ter sido excluído ou ocorreu um erro no servidor.
            </p>
            <button
              onClick={() => router.push('/admin/candidates')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Voltar para lista de candidatos
            </button>
          </div>
        </div>
      </div>
    );
  }`;

  // Encontrar um bom lugar para inserir a verificação de segurança
  const renderStartIndex = frontendContent.indexOf('return (');
  if (renderStartIndex !== -1) {
    frontendContent = frontendContent.substring(0, renderStartIndex) + renderSafetyCheck + '\n\n  ' + frontendContent.substring(renderStartIndex);
  }

  fs.writeFileSync(frontendFilePath, frontendContent);
  console.log('Hotfix do frontend aplicado com sucesso!');

} catch (error) {
  console.error('Erro ao aplicar hotfix:', error);
  process.exit(1);
}
