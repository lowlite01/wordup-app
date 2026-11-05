-- CreateTable
CREATE TABLE "TgAccount" (
    "telegramId" BIGINT NOT NULL,
    "premiumUntil" TIMESTAMP(3),
    "introUsed" BOOLEAN NOT NULL DEFAULT false,
    "gemCredit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TgAccount_pkey" PRIMARY KEY ("telegramId")
);

-- CreateTable
CREATE TABLE "StarPayment" (
    "chargeId" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "product" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarPayment_pkey" PRIMARY KEY ("chargeId")
);

-- CreateIndex
CREATE INDEX "StarPayment_telegramId_idx" ON "StarPayment"("telegramId");

