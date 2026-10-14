-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "RandomTable" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entries" JSONB NOT NULL DEFAULT '[]',
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RandomTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RandomTable_campaignId_idx" ON "RandomTable"("campaignId");

-- AddForeignKey
ALTER TABLE "RandomTable" ADD CONSTRAINT "RandomTable_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

