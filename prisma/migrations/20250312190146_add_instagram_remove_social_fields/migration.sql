/*
  Warnings:

  - You are about to drop the column `github` on the `Candidate` table. All the data in the column will be lost.
  - You are about to drop the column `linkedin` on the `Candidate` table. All the data in the column will be lost.
  - You are about to drop the column `portfolio` on the `Candidate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Candidate" DROP COLUMN "github",
DROP COLUMN "linkedin",
DROP COLUMN "portfolio",
ADD COLUMN     "instagram" TEXT;
