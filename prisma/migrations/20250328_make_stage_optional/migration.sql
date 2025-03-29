-- Alterar a coluna stageId para ser nullable (opcional)
ALTER TABLE "Question" ALTER COLUMN "stageId" DROP NOT NULL;
