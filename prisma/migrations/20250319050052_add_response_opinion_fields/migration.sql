-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "categoryName" TEXT,
ADD COLUMN     "optionCharacteristic" TEXT,
ADD COLUMN     "optionId" TEXT,
ADD COLUMN     "optionOriginalOrder" INTEGER,
ADD COLUMN     "optionsOrder" JSONB,
ADD COLUMN     "questionSnapshot" JSONB,
ADD COLUMN     "questionType" TEXT,
ADD COLUMN     "stageId" TEXT,
ADD COLUMN     "stageName" TEXT;
