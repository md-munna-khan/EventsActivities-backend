-- CreateEnum
CREATE TYPE "hostsStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "hosts" ADD COLUMN     "status" "hostsStatus" NOT NULL DEFAULT 'PENDING';
