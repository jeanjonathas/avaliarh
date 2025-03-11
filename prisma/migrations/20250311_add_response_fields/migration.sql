-- AlterTable
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
  "questionText" = (
    SELECT q.text FROM "Question" q WHERE q.id = "Response"."questionId"
  ),
  "optionText" = (
    SELECT o.text FROM "Option" o WHERE o.id = "Response"."optionId"
  ),
  "isCorrectOption" = (
    SELECT o."isCorrect" FROM "Option" o WHERE o.id = "Response"."optionId"
  ),
  "stageName" = (
    SELECT s.title FROM "Stage" s 
    JOIN "Question" q ON q."stageId" = s.id 
    WHERE q.id = "Response"."questionId"
  ),
  "categoryName" = (
    SELECT c.name FROM "Category" c 
    JOIN "Question" q ON q."categoryId" = c.id 
    WHERE q.id = "Response"."questionId" AND q."categoryId" IS NOT NULL
  )
WHERE "questionText" IS NULL OR "optionText" IS NULL OR "isCorrectOption" IS NULL;

-- Adicionar NOT NULL constraint depois de preencher os dados
ALTER TABLE "Response" ALTER COLUMN "questionText" SET NOT NULL;
ALTER TABLE "Response" ALTER COLUMN "optionText" SET NOT NULL;
ALTER TABLE "Response" ALTER COLUMN "isCorrectOption" SET NOT NULL;
