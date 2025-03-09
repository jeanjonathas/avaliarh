-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "testId" TEXT;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
