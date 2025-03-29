-- Adicionar campo deleted à tabela Question
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false;
