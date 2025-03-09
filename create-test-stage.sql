-- Criar tabela TestStage se não existir
CREATE TABLE IF NOT EXISTS "TestStage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "testId" UUID NOT NULL,
  "stageId" UUID NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE("testId", "stageId"),
  CONSTRAINT "TestStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"(id) ON DELETE CASCADE,
  CONSTRAINT "TestStage_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"(id) ON DELETE CASCADE
);
