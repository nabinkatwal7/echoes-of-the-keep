-- AlterTable
ALTER TABLE "Spell" ADD COLUMN "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "Spell_campaignId_idx" ON "Spell"("campaignId");

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
