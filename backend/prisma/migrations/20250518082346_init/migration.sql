-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('accepted', 'rejected');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "responseStatus" "ResponseStatus";
