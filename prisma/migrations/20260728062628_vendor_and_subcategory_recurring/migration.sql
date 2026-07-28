-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Vendor" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_householdId_idx" ON "Vendor"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_householdId_name_key" ON "Vendor"("householdId", "name");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
