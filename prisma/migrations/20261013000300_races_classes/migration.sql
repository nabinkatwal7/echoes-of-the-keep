-- CreateTable
CREATE TABLE "Race" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "traits" JSONB NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPages" INTEGER[],

    CONSTRAINT "Race_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "Class" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hitDie" INTEGER NOT NULL,
    "proficiencies" JSONB NOT NULL,
    "levelTable" JSONB NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPages" INTEGER[],

    CONSTRAINT "Class_pkey" PRIMARY KEY ("index")
);

