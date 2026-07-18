-- Support Intake module: machines, support_requests, support_routing
-- Tenant isolation is application-level via dealer_id (no Postgres RLS, matching
-- the rest of this schema). status/type/channel/routed_to are TEXT unions.

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "reg_no" TEXT,
    "chassis_no" TEXT,
    "delivery_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "machine_id" TEXT,
    "phone" TEXT NOT NULL,
    "caller_name" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "channel" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "note_en" TEXT,
    "routed_to" TEXT,
    "routed_to_phone" TEXT,
    "transferred" BOOLEAN NOT NULL DEFAULT false,
    "external_call_id" TEXT,
    "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "seen_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_routing" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "mechanic_phone" TEXT,
    "technician_phone" TEXT,
    "dealer_phone" TEXT,
    "office_hours_start" TEXT NOT NULL DEFAULT '09:00',
    "office_hours_end" TEXT NOT NULL DEFAULT '19:00',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_routing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machines_dealer_id_idx" ON "machines"("dealer_id");

-- CreateIndex
CREATE INDEX "machines_contact_id_idx" ON "machines"("contact_id");

-- CreateIndex
CREATE INDEX "machines_reg_no_idx" ON "machines"("reg_no");

-- CreateIndex
CREATE UNIQUE INDEX "support_requests_external_call_id_key" ON "support_requests"("external_call_id");

-- CreateIndex
CREATE INDEX "support_requests_dealer_id_status_idx" ON "support_requests"("dealer_id", "status");

-- CreateIndex
CREATE INDEX "support_requests_dealer_id_type_idx" ON "support_requests"("dealer_id", "type");

-- CreateIndex
CREATE INDEX "support_requests_dealer_id_created_at_idx" ON "support_requests"("dealer_id", "created_at");

-- CreateIndex
CREATE INDEX "support_requests_phone_idx" ON "support_requests"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "support_routing_dealer_id_key" ON "support_routing"("dealer_id");

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_routing" ADD CONSTRAINT "support_routing_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
