-- Org onboarding: brand catalog + dealer setup-state fields

CREATE TABLE "brands" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "category"   TEXT NOT NULL DEFAULT 'tractor',
  "logo_url"   TEXT,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "brands_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "brands_name_key" UNIQUE ("name")
);

ALTER TABLE "dealers" ADD COLUMN "brand_ids"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "dealers" ADD COLUMN "business_type"      TEXT;
ALTER TABLE "dealers" ADD COLUMN "onboarding_status"  TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "dealers" ADD COLUMN "onboarding_step"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "dealers" ADD COLUMN "gst_verified"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dealers" ADD COLUMN "logo_url"           TEXT;
