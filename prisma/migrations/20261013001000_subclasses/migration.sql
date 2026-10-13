-- CreateTable
CREATE TABLE "Subclass" (
    "index" TEXT NOT NULL,
    "classIndex" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPage" INTEGER,

    CONSTRAINT "Subclass_pkey" PRIMARY KEY ("index")
);

-- CreateIndex
CREATE INDEX "Subclass_classIndex_idx" ON "Subclass"("classIndex");

