-- DropForeignKey
ALTER TABLE "CategorySplitConfig" DROP CONSTRAINT "CategorySplitConfig_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CategorySplitConfig" DROP CONSTRAINT "CategorySplitConfig_familyId_fkey";

-- DropTable
DROP TABLE "CategorySplitConfig";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "splitMethod";

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "splitMethod" "SplitMethod" NOT NULL DEFAULT 'EQUAL';

-- CreateTable
CREATE TABLE "SubcategorySplitConfig" (
    "id" UUID NOT NULL,
    "subcategoryId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "inputValue" DECIMAL(12,4),

    CONSTRAINT "SubcategorySplitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubcategorySplitConfig_familyId_idx" ON "SubcategorySplitConfig"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategorySplitConfig_subcategoryId_familyId_key" ON "SubcategorySplitConfig"("subcategoryId", "familyId");

-- AddForeignKey
ALTER TABLE "SubcategorySplitConfig" ADD CONSTRAINT "SubcategorySplitConfig_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategorySplitConfig" ADD CONSTRAINT "SubcategorySplitConfig_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
