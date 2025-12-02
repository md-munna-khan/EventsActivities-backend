/*
  Warnings:

  - You are about to drop the column `paymentStatus` on the `payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "event_participants" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "paymentStatus";

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "hosts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
