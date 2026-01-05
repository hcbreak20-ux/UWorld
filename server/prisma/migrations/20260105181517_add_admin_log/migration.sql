/*
  Warnings:

  - You are about to drop the column `details` on the `AdminLog` table. All the data in the column will be lost.
  - Made the column `targetUserId` on table `AdminLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reason` on table `AdminLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AdminLog" DROP CONSTRAINT "AdminLog_adminId_fkey";

-- DropForeignKey
ALTER TABLE "AdminLog" DROP CONSTRAINT "AdminLog_targetUserId_fkey";

-- DropIndex
DROP INDEX "AdminLog_action_idx";

-- AlterTable
ALTER TABLE "AdminLog" DROP COLUMN "details",
ADD COLUMN     "duration" INTEGER,
ALTER COLUMN "targetUserId" SET NOT NULL,
ALTER COLUMN "reason" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
