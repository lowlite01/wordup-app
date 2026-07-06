-- CreateTable
CREATE TABLE "WordGroup" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WordGroup_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WordEntry" (
    "id" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "def" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordEntry_groupKey_idx" ON "WordEntry"("groupKey");

-- AddForeignKey
ALTER TABLE "WordEntry" ADD CONSTRAINT "WordEntry_groupKey_fkey" FOREIGN KEY ("groupKey") REFERENCES "WordGroup"("key") ON DELETE CASCADE ON UPDATE CASCADE;
