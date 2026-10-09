ALTER TABLE "users"
  ADD COLUMN "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email_verification_token_hash" TEXT,
  ADD COLUMN "email_verification_expires_at" TIMESTAMP(3),
  ADD COLUMN "password_reset_token_hash" TEXT,
  ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_email_verification_token_hash_key"
  ON "users"("email_verification_token_hash");
CREATE UNIQUE INDEX "users_password_reset_token_hash_key"
  ON "users"("password_reset_token_hash");
