-- CreateTable
CREATE TABLE "GlobalCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GlobalCategoryToGlobalQuestion" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_GlobalCategoryToGlobalQuestion_AB_unique" ON "_GlobalCategoryToGlobalQuestion"("A", "B");

-- CreateIndex
CREATE INDEX "_GlobalCategoryToGlobalQuestion_B_index" ON "_GlobalCategoryToGlobalQuestion"("B");

-- AddForeignKey
ALTER TABLE "_GlobalCategoryToGlobalQuestion" ADD CONSTRAINT "_GlobalCategoryToGlobalQuestion_A_fkey" FOREIGN KEY ("A") REFERENCES "GlobalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GlobalCategoryToGlobalQuestion" ADD CONSTRAINT "_GlobalCategoryToGlobalQuestion_B_fkey" FOREIGN KEY ("B") REFERENCES "GlobalQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
