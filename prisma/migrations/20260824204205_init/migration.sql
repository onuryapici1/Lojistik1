-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sube" TEXT NOT NULL,
    "siparisTarihi" TEXT NOT NULL,
    "teslimTarihi" TEXT NOT NULL,
    "pageMode" TEXT NOT NULL DEFAULT 'auto',
    "splitCount" INTEGER NOT NULL DEFAULT 1,
    "scale" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "malzemeAdi" TEXT NOT NULL DEFAULT '',
    "miktar" TEXT NOT NULL DEFAULT '',
    "stokDurumu" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_position_idx" ON "OrderItem"("orderId", "position");
