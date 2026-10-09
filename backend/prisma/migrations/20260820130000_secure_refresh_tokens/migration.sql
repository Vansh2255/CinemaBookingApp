-- Refresh tokens are bearer credentials. Store only a one-way SHA-256 hash so
-- a database leak cannot be used to authenticate as a user.
ALTER TABLE "refresh_tokens" ADD COLUMN "token_hash" TEXT;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE "refresh_tokens" SET "token_hash" = encode(digest("token", 'sha256'), 'hex');
ALTER TABLE "refresh_tokens" ALTER COLUMN "token_hash" SET NOT NULL;
ALTER TABLE "refresh_tokens" DROP COLUMN "token";
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
