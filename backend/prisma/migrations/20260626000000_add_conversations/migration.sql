CREATE TABLE "conversations" (
  "id"           TEXT NOT NULL,
  "dealer_id"    TEXT NOT NULL,
  "contact_id"   TEXT NOT NULL,
  "campaign_id"  TEXT,
  "channel"      TEXT NOT NULL,
  "direction"    TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'delivered',
  "sentiment"    TEXT,
  "intent"       TEXT,
  "duration_sec" INTEGER,
  "media_url"    TEXT,
  "twilio_sid"   TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_twilio_sid_key" UNIQUE ("twilio_sid"),
  CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "conversations_dealer_id_contact_id_created_at_idx" ON "conversations"("dealer_id", "contact_id", "created_at");
CREATE INDEX "conversations_dealer_id_campaign_id_idx" ON "conversations"("dealer_id", "campaign_id");
CREATE INDEX "conversations_twilio_sid_idx" ON "conversations"("twilio_sid");
