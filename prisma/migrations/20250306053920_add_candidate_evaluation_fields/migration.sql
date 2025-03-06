-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "infoJobsLink" TEXT,
ADD COLUMN     "interviewDate" TIMESTAMP(3),
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "resumeFile" TEXT,
ADD COLUMN     "socialMediaUrl" TEXT,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'PENDING';
