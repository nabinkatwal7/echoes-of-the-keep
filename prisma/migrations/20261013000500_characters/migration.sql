-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "raceIndex" TEXT NOT NULL,
    "subraceIndex" TEXT,
    "backgroundIndex" TEXT NOT NULL,
    "alignment" TEXT,
    "classes" JSONB NOT NULL,
    "baseScores" JSONB NOT NULL,
    "abilityMethod" TEXT NOT NULL,
    "scoreBonuses" JSONB NOT NULL DEFAULT '{}',
    "skillProficiencies" JSONB NOT NULL DEFAULT '[]',
    "skillExpertise" JSONB NOT NULL DEFAULT '[]',
    "feats" JSONB NOT NULL DEFAULT '[]',
    "speed" INTEGER NOT NULL DEFAULT 30,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "inspiration" BOOLEAN NOT NULL DEFAULT false,
    "currentHp" INTEGER NOT NULL,
    "tempHp" INTEGER NOT NULL DEFAULT 0,
    "hitDiceSpent" JSONB NOT NULL DEFAULT '{}',
    "deathSaves" JSONB NOT NULL DEFAULT '{"successes":0,"failures":0}',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "exhaustion" INTEGER NOT NULL DEFAULT 0,
    "currency" JSONB NOT NULL DEFAULT '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}',
    "equipment" JSONB NOT NULL DEFAULT '[]',
    "spellSlotsUsed" JSONB NOT NULL DEFAULT '[]',
    "resources" JSONB NOT NULL DEFAULT '[]',
    "personality" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_ownerId_idx" ON "Character"("ownerId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

