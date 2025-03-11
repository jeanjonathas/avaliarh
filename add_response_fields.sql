-- Script para adicionar campos de snapshot à tabela Response
ALTER TABLE "Response" ADD COLUMN "questionText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Response" ADD COLUMN "optionText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Response" ADD COLUMN "isCorrectOption" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Response" ADD COLUMN "allOptionsSnapshot" JSONB;
ALTER TABLE "Response" ADD COLUMN "categoryName" TEXT;
ALTER TABLE "Response" ADD COLUMN "stageName" TEXT;

-- Remover os valores padrão após adicionar as colunas
ALTER TABLE "Response" ALTER COLUMN "questionText" DROP DEFAULT;
ALTER TABLE "Response" ALTER COLUMN "optionText" DROP DEFAULT;
ALTER TABLE "Response" ALTER COLUMN "isCorrectOption" DROP DEFAULT;
