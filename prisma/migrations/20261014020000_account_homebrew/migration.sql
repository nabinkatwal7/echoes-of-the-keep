ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "recoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "LoginThrottle" (
    "username" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("username")
);

CREATE TABLE "HomebrewEntry" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomebrewEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomebrewEntry_ownerId_kind_idx" ON "HomebrewEntry"("ownerId", "kind");

ALTER TABLE "HomebrewEntry" ADD CONSTRAINT "HomebrewEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
