CREATE TABLE "coupons" (
  "id" SERIAL NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "discount_type" VARCHAR(20) NOT NULL,
  "discount_value" DECIMAL(10,2) NOT NULL,
  "min_order_amount" DECIMAL(10,2),
  "max_discount" DECIMAL(10,2),
  "usage_limit" INTEGER,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
ALTER TABLE "reservations"
  ADD COLUMN "base_amount" DECIMAL(10,2),
  ADD COLUMN "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "final_amount" DECIMAL(10,2),
  ADD COLUMN "coupon_id" INTEGER;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
