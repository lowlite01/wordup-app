-- AlterTable
ALTER TABLE "TgAccount" ADD COLUMN "linkKey" TEXT,
ADD COLUMN "inbox" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "TgAccount_linkKey_key" ON "TgAccount"("linkKey");
