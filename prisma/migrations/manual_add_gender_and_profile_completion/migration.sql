-- Adicionar campo gender à tabela Candidate
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- Adicionar campo requiresProfileCompletion à tabela Candidate
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "requiresProfileCompletion" BOOLEAN NOT NULL DEFAULT false;

-- Adicionar campo deleted à tabela Question
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false;
