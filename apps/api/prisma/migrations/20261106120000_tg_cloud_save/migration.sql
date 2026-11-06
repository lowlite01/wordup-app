-- AlterTable
ALTER TABLE "TgAccount" ADD COLUMN "state" JSONB,
ADD COLUMN "stateAt" TIMESTAMP(3);
