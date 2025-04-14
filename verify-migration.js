const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('Verificando se a migração foi aplicada corretamente...');
  
  try {
    // Verificar se a tabela Response tem as colunas necessárias
    const hasRequiredColumns = await checkResponseColumns();
    
    if (!hasRequiredColumns) {
      console.log('Colunas necessárias não encontradas na tabela Response, aplicando correção manual...');
      await applyManualFix();
    } else {
      console.log('Migração aplicada corretamente! Todas as colunas necessárias estão presentes.');
    }
    
    // Verificar se há respostas com campos nulos que deveriam ser NOT NULL
    await checkAndFixNullValues();
    
    console.log('Verificação concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a verificação da migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkResponseColumns() {
  try {
    // Tentar buscar uma resposta com as colunas que deveriam existir
    const testResponse = await prisma.$queryRaw`
      SELECT 
        "questionText", 
        "optionText", 
        "isCorrectOption"
      FROM "Response"
      LIMIT 1;
    `;
    
    // Se chegou aqui, as colunas existem
    return true;
  } catch (error) {
    // Se ocorreu um erro, provavelmente as colunas não existem
    console.error('Erro ao verificar colunas:', error.message);
    return false;
  }
}

async function applyManualFix() {
  try {
    // Aplicar ALTER TABLE manualmente
    await prisma.$executeRaw`
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "questionText" TEXT;
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "optionText" TEXT;
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "isCorrectOption" BOOLEAN;
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "allOptionsSnapshot" JSONB;
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "questionSnapshot" JSONB;
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "categoryName" TEXT;
      ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "stageName" TEXT;
    `;
    
    // Preencher os dados nas novas colunas
    await prisma.$executeRaw`
      UPDATE "Response" r
      SET 
        "questionText" = (
          SELECT q.text FROM "Question" q WHERE q.id = r."questionId"
        ),
        "optionText" = (
          SELECT o.text FROM "Option" o WHERE o.id = r."optionId"
        ),
        "isCorrectOption" = (
          SELECT o."isCorrect" FROM "Option" o WHERE o.id = r."optionId"
        )
      WHERE r."questionText" IS NULL OR r."optionText" IS NULL OR r."isCorrectOption" IS NULL;
    `;
    
    console.log('Correção manual aplicada com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao aplicar correção manual:', error);
    return false;
  }
}

async function checkAndFixNullValues() {
  try {
    // Verificar se há valores NULL nas colunas que deveriam ser NOT NULL
    const nullResponses = await prisma.$queryRaw`
      SELECT id FROM "Response"
      WHERE "questionText" IS NULL OR "optionText" IS NULL OR "isCorrectOption" IS NULL;
    `;
    
    if (nullResponses.length > 0) {
      console.log(`Encontradas ${nullResponses.length} respostas com valores NULL. Corrigindo...`);
      
      // Atualizar respostas com valores padrão
      await prisma.$executeRaw`
        UPDATE "Response"
        SET 
          "questionText" = 'Texto da questão não disponível'
        WHERE "questionText" IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE "Response"
        SET 
          "optionText" = 'Texto da opção não disponível'
        WHERE "optionText" IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE "Response"
        SET 
          "isCorrectOption" = false
        WHERE "isCorrectOption" IS NULL;
      `;
      
      // Adicionar constraints NOT NULL
      await prisma.$executeRaw`
        ALTER TABLE "Response" ALTER COLUMN "questionText" SET NOT NULL;
        ALTER TABLE "Response" ALTER COLUMN "optionText" SET NOT NULL;
        ALTER TABLE "Response" ALTER COLUMN "isCorrectOption" SET NOT NULL;
      `;
      
      console.log('Valores NULL corrigidos e constraints NOT NULL adicionadas com sucesso!');
    } else {
      console.log('Não foram encontradas respostas com valores NULL. Tudo certo!');
    }
  } catch (error) {
    console.error('Erro ao verificar/corrigir valores NULL:', error);
  }
}

// Executar a verificação
verifyMigration().catch(console.error);
