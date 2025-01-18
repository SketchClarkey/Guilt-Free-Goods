/*
  Warnings:

  - You are about to drop the column `metadata` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Listing` table. All the data in the column will be lost.
  - Added the required column `price` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `condition` on the `Item` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `platform` on the `Listing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `Listing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE', 'FOR_PARTS');

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_itemId_fkey";

-- DropIndex
DROP INDEX "Category_parentId_idx";

-- DropIndex
DROP INDEX "Image_itemId_idx";

-- DropIndex
DROP INDEX "Item_categoryId_idx";

-- DropIndex
DROP INDEX "Item_userId_idx";

-- DropIndex
DROP INDEX "Listing_itemId_idx";

-- DropIndex
DROP INDEX "Listing_platform_externalId_key";

-- DropIndex
DROP INDEX "Listing_userId_idx";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "metadata",
DROP COLUMN "order";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
DROP COLUMN "condition",
ADD COLUMN     "condition" "ItemCondition" NOT NULL;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "currency",
DROP COLUMN "price",
DROP COLUMN "quantity",
ADD COLUMN     "url" TEXT,
DROP COLUMN "platform",
ADD COLUMN     "platform" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "Condition";

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
