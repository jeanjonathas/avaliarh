-- Adicionar colunas faltantes à tabela Response
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "questionText" TEXT;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "optionText" TEXT;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "isCorrectOption" BOOLEAN;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "allOptionsSnapshot" JSONB;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "questionSnapshot" JSONB;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "categoryName" TEXT;
ALTER TABLE "Response" ADD COLUMN IF NOT EXISTS "stageName" TEXT;

-- Preencher as colunas com dados das tabelas relacionadas
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

-- Preencher valores nulos com valores padrão
UPDATE "Response" SET "questionText" = 'Texto da questão não disponível' WHERE "questionText" IS NULL;
UPDATE "Response" SET "optionText" = 'Texto da opção não disponível' WHERE "optionText" IS NULL;
UPDATE "Response" SET "isCorrectOption" = false WHERE "isCorrectOption" IS NULL;

-- Adicionar restrições NOT NULL às colunas principais
ALTER TABLE "Response" ALTER COLUMN "questionText" SET NOT NULL;
ALTER TABLE "Response" ALTER COLUMN "optionText" SET NOT NULL;
ALTER TABLE "Response" ALTER COLUMN "isCorrectOption" SET NOT NULL;
