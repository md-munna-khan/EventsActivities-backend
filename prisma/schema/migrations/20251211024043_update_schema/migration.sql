-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "interests" "Interest"[],
ADD COLUMN     "location" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "hosts" ADD COLUMN     "interests" "Interest"[];
