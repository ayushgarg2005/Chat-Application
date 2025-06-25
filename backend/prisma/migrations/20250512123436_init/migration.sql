/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Connections` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isOnline` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profilePicture` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Changed the type of `status` on the `Connections` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Connections" DROP COLUMN "updatedAt",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bio",
DROP COLUMN "email",
DROP COLUMN "isOnline",
DROP COLUMN "lastSeen",
DROP COLUMN "profilePicture",
DROP COLUMN "updatedAt";

-- DropEnum
DROP TYPE "ConnectionStatus";
