-- CreateTable
CREATE TABLE "ProcessPersonalityConfig" (
    "id" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "emotionGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessPersonalityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityTraitWeight" (
    "id" TEXT NOT NULL,
    "traitName" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "processPersonalityConfigId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityTraitWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessPersonalityConfig_processStageId_key" ON "ProcessPersonalityConfig"("processStageId");

-- AddForeignKey
ALTER TABLE "ProcessPersonalityConfig" ADD CONSTRAINT "ProcessPersonalityConfig_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessPersonalityConfig" ADD CONSTRAINT "ProcessPersonalityConfig_emotionGroupId_fkey" FOREIGN KEY ("emotionGroupId") REFERENCES "EmotionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityTraitWeight" ADD CONSTRAINT "PersonalityTraitWeight_processPersonalityConfigId_fkey" FOREIGN KEY ("processPersonalityConfigId") REFERENCES "ProcessPersonalityConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
