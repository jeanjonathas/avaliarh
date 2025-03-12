-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "requestPhoto" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showResults" BOOLEAN NOT NULL DEFAULT true;
