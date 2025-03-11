-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "stageId" TEXT;

-- CreateTable
CREATE TABLE "CandidateTest" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "inviteExpires" TIMESTAMP(3),
    "inviteSent" BOOLEAN NOT NULL DEFAULT false,
    "inviteAttempts" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateTest_inviteCode_key" ON "CandidateTest"("inviteCode");

-- CreateIndex
CREATE INDEX "CandidateTest_candidateId_idx" ON "CandidateTest"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateTest_testId_idx" ON "CandidateTest"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateTest_candidateId_testId_key" ON "CandidateTest"("candidateId", "testId");

-- AddForeignKey
ALTER TABLE "CandidateTest" ADD CONSTRAINT "CandidateTest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateTest" ADD CONSTRAINT "CandidateTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
