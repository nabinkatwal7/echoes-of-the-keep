-- AlterTable
ALTER TABLE "Creature" ADD COLUMN     "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "Creature_campaignId_idx" ON "Creature"("campaignId");

-- AddForeignKey
ALTER TABLE "Creature" ADD CONSTRAINT "Creature_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

