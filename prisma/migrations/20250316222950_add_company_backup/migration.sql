-- CreateTable
CREATE TABLE "CompanyBackup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyBackup_companyId_idx" ON "CompanyBackup"("companyId");
