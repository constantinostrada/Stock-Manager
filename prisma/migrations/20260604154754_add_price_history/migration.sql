-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "oldPrice" REAL NOT NULL,
    "newPrice" REAL NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceHistory_productId_idx" ON "PriceHistory"("productId");

-- CreateIndex
CREATE INDEX "PriceHistory_changedAt_idx" ON "PriceHistory"("changedAt");
