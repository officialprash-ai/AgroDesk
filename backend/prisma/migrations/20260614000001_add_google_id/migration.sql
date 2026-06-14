-- AlterTable
ALTER TABLE "dealers" ADD COLUMN "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "dealers_google_id_key" ON "dealers"("google_id");
