-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarHairColor" TEXT NOT NULL DEFAULT '#654321',
ADD COLUMN     "avatarPantsColor" TEXT NOT NULL DEFAULT '#9c702dff',
ADD COLUMN     "avatarShirtColor" TEXT NOT NULL DEFAULT '#130a01ff',
ADD COLUMN     "avatarSkinColor" TEXT NOT NULL DEFAULT '#FFDCB1';
