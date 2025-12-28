-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeBadgeId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeBadgeId_fkey" FOREIGN KEY ("activeBadgeId") REFERENCES "Badge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
