-- AlterTable
ALTER TABLE "TgAccount" ADD COLUMN "name" TEXT,
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "words" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "streak" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "TgAccount_words_idx" ON "TgAccount"("words");
