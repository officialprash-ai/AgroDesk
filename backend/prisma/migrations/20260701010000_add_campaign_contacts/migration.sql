-- Individual contact <-> campaign attachment (single-add or CSV import)

CREATE TABLE "campaign_contacts" (
  "id"          TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "contact_id"  TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "campaign_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_contacts_campaign_id_contact_id_key" UNIQUE ("campaign_id", "contact_id"),
  CONSTRAINT "campaign_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "campaign_contacts_campaign_id_idx" ON "campaign_contacts"("campaign_id");
