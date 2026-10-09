-- A cancelled/expired reservation must release its seat while remaining in the
-- audit trail. PostgreSQL partial indexes enforce uniqueness only for seats
-- that are currently being held or booked.
DROP INDEX IF EXISTS "reservations_showtime_id_seat_id_key";

ALTER TABLE "reservations"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "reservations_active_showtime_seat_key"
  ON "reservations"("showtime_id", "seat_id")
  WHERE "status" IN ('PENDING', 'CONFIRMED');

CREATE INDEX "reservations_showtime_id_status_idx"
  ON "reservations"("showtime_id", "status");

CREATE INDEX "reservations_user_id_status_idx"
  ON "reservations"("user_id", "status");
