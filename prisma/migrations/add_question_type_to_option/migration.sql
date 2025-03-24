-- Adicionar coluna questionType à tabela Option
ALTER TABLE "Option" ADD COLUMN "questionType" TEXT NOT NULL DEFAULT 'selection';

-- Atualizar o questionType das opções com base nas perguntas relacionadas
UPDATE "Option" o
SET "questionType" = q."questionType"
FROM "Question" q
WHERE o."questionId" = q.id;
