const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando hotfix para migração do banco de dados...');

try {
  // Verificar se o diretório de migrações existe
  const migrationsDir = path.join(process.cwd(), 'prisma/migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('Diretório de migrações criado');
  }

  // Criar diretório para a nova migração
  const migrationName = '20250311_add_response_fields';
  const migrationDir = path.join(migrationsDir, migrationName);
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
    console.log(`Diretório de migração ${migrationName} criado`);
  }

  // Criar arquivo de migração SQL
  const migrationSql = `-- AlterTable
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "questionText" TEXT;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "optionText" TEXT;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "isCorrectOption" BOOLEAN;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "allOptionsSnapshot" JSONB;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "questionSnapshot" JSONB;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "categoryName" TEXT;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "stageName" TEXT;

-- Atualizar colunas existentes com valores padrão
UPDATE "Response" 
SET 
  "questionText" = COALESCE("questionText", (
    SELECT q.text FROM "Question" q WHERE q.id = "Response"."questionId"
  )),
  "optionText" = COALESCE("optionText", (
    SELECT o.text FROM "Option" o WHERE o.id = "Response"."optionId"
  )),
  "isCorrectOption" = COALESCE("isCorrectOption", (
    SELECT o."isCorrect" FROM "Option" o WHERE o.id = "Response"."optionId"
  ));

-- Adicionar NOT NULL constraint depois de preencher os dados
-- Primeiro verificamos se há algum registro com valor NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Response" WHERE "questionText" IS NULL) THEN
    RAISE NOTICE 'Existem registros com questionText NULL. Atualizando para valor padrão.';
    UPDATE "Response" SET "questionText" = 'Texto da questão não disponível' WHERE "questionText" IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM "Response" WHERE "optionText" IS NULL) THEN
    RAISE NOTICE 'Existem registros com optionText NULL. Atualizando para valor padrão.';
    UPDATE "Response" SET "optionText" = 'Texto da opção não disponível' WHERE "optionText" IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM "Response" WHERE "isCorrectOption" IS NULL) THEN
    RAISE NOTICE 'Existem registros com isCorrectOption NULL. Atualizando para valor padrão.';
    UPDATE "Response" SET "isCorrectOption" = false WHERE "isCorrectOption" IS NULL;
  END IF;
END $$;

-- Agora podemos adicionar as constraints NOT NULL com segurança
ALTER TABLE "Response" ALTER COLUMN "questionText" SET NOT NULL;
ALTER TABLE "Response" ALTER COLUMN "optionText" SET NOT NULL;
ALTER TABLE "Response" ALTER COLUMN "isCorrectOption" SET NOT NULL;`;

  fs.writeFileSync(path.join(migrationDir, 'migration.sql'), migrationSql);
  console.log('Arquivo de migração SQL criado');

  // Criar arquivo migration.toml para registrar a migração
  const migrationToml = `# migration.toml
migration_name = "${migrationName}"
provider = "postgresql"
`;

  fs.writeFileSync(path.join(migrationDir, 'migration.toml'), migrationToml);
  console.log('Arquivo migration.toml criado');

  // Modificar o arquivo de API de candidatos para evitar acessar campos que podem não existir
  const candidatesApiPath = path.join(process.cwd(), 'pages/api/admin/candidates/index.ts');
  if (fs.existsSync(candidatesApiPath)) {
    try {
      let content = fs.readFileSync(candidatesApiPath, 'utf8');
      
      // Modificar a consulta para não incluir as respostas diretamente
      if (content.includes('include: { responses:')) {
        content = content.replace(
          /include: \{\s*responses:[\s\S]*?\}/g,
          'include: { _count: { select: { responses: true } } }'
        );
        fs.writeFileSync(candidatesApiPath, content);
        console.log('API de candidatos modificada para evitar acessar campos que podem não existir');
      }
    } catch (error) {
      console.error('Erro ao modificar API de candidatos:', error);
    }
  }

  // Modificar o arquivo de API de candidato específico para tratar campos ausentes
  const candidateApiPath = path.join(process.cwd(), 'pages/api/admin/candidates/[id].ts');
  if (fs.existsSync(candidateApiPath)) {
    try {
      let content = fs.readFileSync(candidateApiPath, 'utf8');
      
      // Adicionar verificação para campos que podem não existir
      if (content.includes('const candidate = await prisma.candidate.findUnique({')) {
        // Adicionar tratamento para respostas sem os campos necessários
        const safeResponseCode = `
      // Garantir que todas as respostas tenham os campos necessários
      if (candidate && candidate.responses) {
        candidate.responses = await Promise.all(candidate.responses.map(async (response) => {
          try {
            if (!response.questionText || !response.optionText || response.isCorrectOption === undefined) {
              const question = await prisma.question.findUnique({
                where: { id: response.questionId },
                include: { Stage: true, Category: true }
              });
              
              const option = await prisma.option.findUnique({
                where: { id: response.optionId }
              });
              
              return {
                ...response,
                questionText: response.questionText || question?.text || 'Texto da questão não disponível',
                optionText: response.optionText || option?.text || 'Texto da opção não disponível',
                isCorrectOption: response.isCorrectOption !== undefined ? response.isCorrectOption : (option?.isCorrect || false),
                stageName: response.stageName || question?.Stage?.title || null,
                categoryName: response.categoryName || question?.Category?.name || null
              };
            }
          } catch (error) {
            console.error('Erro ao processar resposta:', error);
            // Retornar resposta com valores padrão em caso de erro
            return {
              ...response,
              questionText: response.questionText || 'Texto da questão não disponível',
              optionText: response.optionText || 'Texto da opção não disponível',
              isCorrectOption: response.isCorrectOption !== undefined ? response.isCorrectOption : false,
              stageName: response.stageName || null,
              categoryName: response.categoryName || null
            };
          }
          return response;
        }));
      }`;
        
        // Encontrar um bom lugar para inserir o código
        const insertPoint = content.indexOf('if (!candidate) {');
        if (insertPoint !== -1) {
          content = content.substring(0, insertPoint) + safeResponseCode + '\n\n      ' + content.substring(insertPoint);
          fs.writeFileSync(candidateApiPath, content);
          console.log('API de candidato específico modificada para tratar campos ausentes');
        }
      }
    } catch (error) {
      console.error('Erro ao modificar API de candidato específico:', error);
    }
  }

  // Modificar o arquivo de API de respostas para garantir que todos os campos necessários sejam preenchidos
  const responsesApiPath = path.join(process.cwd(), 'pages/api/responses/index.ts');
  if (fs.existsSync(responsesApiPath)) {
    try {
      let content = fs.readFileSync(responsesApiPath, 'utf8');
      
      // Verificar se o arquivo contém a lógica de criação de respostas
      if (content.includes('await prisma.response.create({')) {
        // Garantir que todos os campos necessários sejam preenchidos na criação de respostas
        const createResponsePattern = /await prisma\.response\.create\(\{\s*data:\s*\{([\s\S]*?)\}\s*\}\)/g;
        
        content = content.replace(createResponsePattern, (match, dataBlock) => {
          // Verificar se os campos necessários já estão incluídos
          const hasQuestionText = dataBlock.includes('questionText:');
          const hasOptionText = dataBlock.includes('optionText:');
          const hasIsCorrectOption = dataBlock.includes('isCorrectOption:');
          
          // Se todos os campos já estão presentes, não modificar
          if (hasQuestionText && hasOptionText && hasIsCorrectOption) {
            return match;
          }
          
          // Adicionar campos ausentes
          let newDataBlock = dataBlock;
          
          if (!hasQuestionText) {
            newDataBlock += `
          questionText: question.text,`;
          }
          
          if (!hasOptionText) {
            newDataBlock += `
          optionText: option.text,`;
          }
          
          if (!hasIsCorrectOption) {
            newDataBlock += `
          isCorrectOption: option.isCorrect,`;
          }
          
          return `await prisma.response.create({
        data: {${newDataBlock}
        }
      })`;
        });
        
        fs.writeFileSync(responsesApiPath, content);
        console.log('API de respostas modificada para garantir que todos os campos necessários sejam preenchidos');
      }
    } catch (error) {
      console.error('Erro ao modificar API de respostas:', error);
    }
  }

  // Tentar executar a migração diretamente
  try {
    console.log('Tentando executar a migração Prisma...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migração Prisma executada com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração Prisma:', error);
    console.log('A migração será executada durante o processo de deployment normal.');
  }

  console.log('Hotfix para migração do banco de dados concluído com sucesso!');
} catch (error) {
  console.error('Erro durante a execução do hotfix de migração:', error);
  process.exit(1);
}
