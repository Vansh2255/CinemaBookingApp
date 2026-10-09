ALTER TABLE "reservations" ADD COLUMN "expires_at" TIMESTAMP(3);
CREATE INDEX "reservations_status_expires_at_idx" ON "reservations"("status", "expires_at");
