-- CreateTable
CREATE TABLE "StageQuestion" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageQuestion_stageId_idx" ON "StageQuestion"("stageId");

-- CreateIndex
CREATE INDEX "StageQuestion_questionId_idx" ON "StageQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "StageQuestion_stageId_questionId_key" ON "StageQuestion"("stageId", "questionId");

-- AddForeignKey
ALTER TABLE "StageQuestion" ADD CONSTRAINT "StageQuestion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageQuestion" ADD CONSTRAINT "StageQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
