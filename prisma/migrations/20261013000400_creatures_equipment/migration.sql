-- CreateTable
CREATE TABLE "Creature" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "alignment" TEXT NOT NULL,
    "armorClass" TEXT,
    "hitPoints" TEXT,
    "speed" TEXT,
    "abilities" JSONB,
    "savingThrows" TEXT,
    "skills" TEXT,
    "damageResistances" TEXT,
    "senses" TEXT,
    "languages" TEXT,
    "challenge" TEXT,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPages" INTEGER[],

    CONSTRAINT "Creature_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cost" TEXT NOT NULL,
    "weight" TEXT,
    "damage" TEXT,
    "properties" TEXT,
    "armorClass" TEXT,
    "strengthRequired" TEXT,
    "stealthDisadvantage" BOOLEAN,
    "details" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPage" INTEGER NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("index")
);

