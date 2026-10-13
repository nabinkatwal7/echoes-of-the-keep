-- Replace Auth.js (OAuth/email) with username + password accounts.
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

DROP INDEX IF EXISTS "User_email_key";

ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- keep existing rows valid; their password hash is unusable until a new account is registered
UPDATE "User" SET
  "username" = 'user_' || left("id", 8),
  "displayName" = COALESCE("name", 'Adventurer'),
  "passwordHash" = '!';

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "displayName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "name";
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" DROP COLUMN "emailVerified";
ALTER TABLE "User" DROP COLUMN "image";

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
