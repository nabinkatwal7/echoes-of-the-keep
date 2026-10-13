-- CreateTable
CREATE TABLE "Spell" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "ritual" BOOLEAN NOT NULL DEFAULT false,
    "concentration" BOOLEAN NOT NULL DEFAULT false,
    "castingTime" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "components" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "higherLevels" TEXT NOT NULL DEFAULT '',
    "classes" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'PHB',

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("index")
);

-- CreateIndex
CREATE INDEX "Spell_level_idx" ON "Spell"("level");

