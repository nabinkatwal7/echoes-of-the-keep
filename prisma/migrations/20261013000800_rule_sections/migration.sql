-- CreateTable
CREATE TABLE "RuleSection" (
    "id" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "chapterTitle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PHB',
    "pdfPage" INTEGER,

    CONSTRAINT "RuleSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuleSection_chapter_position_idx" ON "RuleSection"("chapter", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSection_chapter_slug_key" ON "RuleSection"("chapter", "slug");

