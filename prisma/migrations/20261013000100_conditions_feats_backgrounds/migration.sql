-- CreateTable
CREATE TABLE "Condition" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPages" INTEGER[],

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "Feat" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prerequisite" TEXT,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPages" INTEGER[],

    CONSTRAINT "Feat_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "Background" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skillProficiencies" TEXT,
    "toolProficiencies" TEXT,
    "languages" TEXT,
    "equipment" TEXT,
    "featureName" TEXT,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPages" INTEGER[],

    CONSTRAINT "Background_pkey" PRIMARY KEY ("index")
);

