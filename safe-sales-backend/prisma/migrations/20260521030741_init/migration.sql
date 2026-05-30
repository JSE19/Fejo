-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('pending_payment', 'payment_locked', 'shipped', 'delivered', 'completed', 'disputed', 'refunded');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('direct_resolution', 'escalated', 'evidence_requested', 'mediating', 'resolved');

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "npub" TEXT NOT NULL,
    "pubkey" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "bio" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankHolder" TEXT,
    "lnAddress" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceNGN" INTEGER NOT NULL,
    "images" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "variants" JSONB,
    "inStock" INTEGER NOT NULL DEFAULT 1,
    "delivery" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nostrEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "orderToken" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerNpub" TEXT NOT NULL,
    "buyerPubkey" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "buyerCity" TEXT NOT NULL,
    "buyerAddress" TEXT,
    "contactMethod" TEXT,
    "variant" TEXT,
    "amountNGN" INTEGER NOT NULL,
    "amountSats" INTEGER NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'pending_payment',
    "cashuToken" TEXT,
    "bitnobAccount" TEXT,
    "bitnobBank" TEXT,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "shippedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "autoReleaseAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "summary" TEXT,
    "openedBy" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" "DisputeStatus" NOT NULL DEFAULT 'direct_resolution',
    "directResolutionUntil" TIMESTAMP(3),
    "evidenceDueAt" TIMESTAMP(3),
    "isReturn" BOOLEAN NOT NULL DEFAULT false,
    "returnEvidence" JSONB,
    "resolution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_npub_key" ON "Seller"("npub");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_pubkey_key" ON "Seller"("pubkey");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_handle_key" ON "Seller"("handle");

-- CreateIndex
CREATE INDEX "Seller_handle_idx" ON "Seller"("handle");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_active_idx" ON "Listing"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shortId_key" ON "Order"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderToken_key" ON "Order"("orderToken");

-- CreateIndex
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");

-- CreateIndex
CREATE INDEX "Order_buyerPubkey_idx" ON "Order"("buyerPubkey");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_autoReleaseAt_idx" ON "Order"("autoReleaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_orderId_key" ON "Dispute"("orderId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
