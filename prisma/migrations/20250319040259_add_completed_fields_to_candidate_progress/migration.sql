/*
  Warnings:

  - Added the required column `jobPosition` to the `SelectionProcess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandidateProgress" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProcessStage" ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SelectionProcess" ADD COLUMN     "jobPosition" TEXT NOT NULL,
ADD COLUMN     "registrationEnd" TIMESTAMP(3),
ADD COLUMN     "registrationStart" TIMESTAMP(3),
ADD COLUMN     "vacancyCount" INTEGER NOT NULL DEFAULT 1;
