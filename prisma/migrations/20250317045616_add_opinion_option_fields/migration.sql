-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "categoryName" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "position" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "categoryId" UUID;
