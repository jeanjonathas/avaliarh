/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "inviteSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_inviteCode_key" ON "Candidate"("inviteCode");
