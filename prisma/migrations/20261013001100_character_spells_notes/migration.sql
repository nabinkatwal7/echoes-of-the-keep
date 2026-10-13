-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "spells" JSONB NOT NULL DEFAULT '{}';

