-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "splitMethod" "SplitMethod" NOT NULL DEFAULT 'EQUAL';

-- CreateTable
CREATE TABLE "CategorySplitConfig" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "inputValue" DECIMAL(12,4),

    CONSTRAINT "CategorySplitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategorySplitConfig_familyId_idx" ON "CategorySplitConfig"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySplitConfig_categoryId_familyId_key" ON "CategorySplitConfig"("categoryId", "familyId");

-- AddForeignKey
ALTER TABLE "CategorySplitConfig" ADD CONSTRAINT "CategorySplitConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySplitConfig" ADD CONSTRAINT "CategorySplitConfig_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
