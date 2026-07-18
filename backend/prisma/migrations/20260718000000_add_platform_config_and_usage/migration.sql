-- Platform-wide runtime config, written by the Sovereign Vault ops panel and
-- read by this backend (cached ~30s) for provider selection and plan limits.
--
-- Idempotent: these objects were first applied directly to the Supabase
-- instance, so this migration must be safe to re-run against a database where
-- they already exist.
CREATE TABLE IF NOT EXISTS "platform_config" (
  "key"        TEXT NOT NULL,
  "value"      JSONB NOT NULL,
  "updated_by" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_config_pkey" PRIMARY KEY ("key")
);

-- Per-dealer monthly usage counters backing plan-limit enforcement.
CREATE TABLE IF NOT EXISTS "usage_counter" (
  "id"         TEXT NOT NULL,
  "dealer_id"  TEXT NOT NULL,
  "metric"     TEXT NOT NULL,
  "period"     TEXT NOT NULL,
  "count"      INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_counter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_counter_dealer_id_metric_period_key"
  ON "usage_counter" ("dealer_id", "metric", "period");

CREATE INDEX IF NOT EXISTS "usage_counter_period_idx"
  ON "usage_counter" ("period");

-- Seed defaults. voice = 'plivo' (primary strategy); llm = 'gemini' because
-- lib/llm.ts replaced Anthropic across AI handlers, OCR and webhooks.
INSERT INTO "platform_config" ("key", "value", "updated_by")
VALUES (
  'providers',
  '{"voice":"plivo","tts":"sarvam","whatsapp":"aisensy","llm":"gemini","sms":"msg91","ocr":"textract"}'::jsonb,
  'migration'
) ON CONFLICT ("key") DO NOTHING;

INSERT INTO "platform_config" ("key", "value", "updated_by")
VALUES (
  'plan_limits',
  '{"starter":{"ai_calls_per_month":500,"whatsapp_msgs_per_month":1000,"sms_per_month":1000,"ai_scripts_per_month":100,"concurrent_calls":2,"contacts_per_dealer":2000,"campaigns_active":2,"api_req_per_min":30},"growth":{"ai_calls_per_month":2000,"whatsapp_msgs_per_month":5000,"sms_per_month":5000,"ai_scripts_per_month":500,"concurrent_calls":8,"contacts_per_dealer":10000,"campaigns_active":10,"api_req_per_min":120},"pro":{"ai_calls_per_month":999999,"whatsapp_msgs_per_month":999999,"sms_per_month":999999,"ai_scripts_per_month":999999,"concurrent_calls":50,"contacts_per_dealer":999999,"campaigns_active":999,"api_req_per_min":500}}'::jsonb,
  'migration'
) ON CONFLICT ("key") DO NOTHING;
