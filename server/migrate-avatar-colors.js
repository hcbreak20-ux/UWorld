/**
 * Script one-time pour ajouter les colonnes de couleurs d'avatar
 * Usage: node migrate-avatar-colors.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Ajout des colonnes de couleurs d\'avatar...');

  try {
    // Exécuter le SQL directement
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "avatarSkinColor" TEXT NOT NULL DEFAULT '#FFDCB1',
      ADD COLUMN IF NOT EXISTS "avatarHairColor" TEXT NOT NULL DEFAULT '#654321',
      ADD COLUMN IF NOT EXISTS "avatarShirtColor" TEXT NOT NULL DEFAULT '#4287F5',
      ADD COLUMN IF NOT EXISTS "avatarPantsColor" TEXT NOT NULL DEFAULT '#323250';
    `);

    console.log('✅ Colonnes ajoutées avec succès!');
    
    // Vérifier
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatarSkinColor: true,
        avatarHairColor: true,
        avatarShirtColor: true,
        avatarPantsColor: true
      },
      take: 1
    });

    console.log('✅ Vérification - Premier utilisateur:');
    console.log(users[0]);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
