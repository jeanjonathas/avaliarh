/*
  Warnings:

  - You are about to drop the column `requestPhoto` on the `ProcessStage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProcessStage" DROP COLUMN "requestPhoto",
ADD COLUMN     "expectedProfile" JSONB,
ADD COLUMN     "requestCandidatePhoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showResultsToCandidate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testId" TEXT;

-- AddForeignKey
ALTER TABLE "ProcessStage" ADD CONSTRAINT "ProcessStage_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;
