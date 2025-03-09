-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "inviteAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inviteExpires" TIMESTAMP(3);
