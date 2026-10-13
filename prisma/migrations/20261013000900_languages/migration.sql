-- CreateTable
CREATE TABLE "Language" (
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',

    CONSTRAINT "Language_pkey" PRIMARY KEY ("index")
);

