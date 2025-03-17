-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "emotionGroupId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "emotionGroupId" TEXT;

-- CreateTable
CREATE TABLE "EmotionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_emotionGroupId_fkey" FOREIGN KEY ("emotionGroupId") REFERENCES "EmotionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
