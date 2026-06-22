-- DropIndex
DROP INDEX "Document_shareId_idx";

-- DropIndex
DROP INDEX "User_paddleCustomerId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "paddleCustomerId",
DROP COLUMN "paddlePlanId",
DROP COLUMN "paddleSubscriptionId",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifyExpires" TIMESTAMP(3),
ADD COLUMN     "verifyToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_shareId_key" ON "Document"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");
