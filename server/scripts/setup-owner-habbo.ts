import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🏨 Setup Owner + Salles Habbo Style');
  console.log('=====================================\n');

  // ⚠️ CONFIGURATION - CHANGEZ CES VALEURS
  const YOUR_USERNAME = 'Hope'; // Votre username actuel
  const CREATE_NEW_ACCOUNT = false; // true si compte n'existe pas
  const NEW_PASSWORD = 'Scarface819'; // Seulement si CREATE_NEW_ACCOUNT = true

  // 1. Gérer le compte owner
  let owner = await prisma.user.findUnique({
    where: { username: YOUR_USERNAME }
  });

  if (!owner && CREATE_NEW_ACCOUNT) {
    console.log('👤 Création du compte owner...');
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    
    owner = await prisma.user.create({
      data: {
        username: YOUR_USERNAME,
        email: `${YOUR_USERNAME}@uworld.com`,
        password: hashedPassword,
        role: 'owner', // ✅ Rôle owner
        coins: 100000,
        gems: 50000,
        motto: '🌟 Fondateur de UWorld',
        level: 99,
        experience: 999999,
        // Couleurs par défaut
        avatarSkinColor: '#FFDCB1',
        avatarHairColor: '#654321',
        avatarShirtColor: '#4287F5',
        avatarPantsColor: '#323250',
      }
    });
    console.log('✅ Compte owner créé!\n');
  } else if (owner) {
    console.log(`👤 Compte trouvé: ${owner.username}`);
    
    // Mettre à jour en owner
    owner = await prisma.user.update({
      where: { id: owner.id },
      data: { 
        role: 'owner',
        coins: Math.max(owner.coins, 100000), // Minimum 100k
        gems: Math.max(owner.gems, 50000),     // Minimum 50k
      }
    });
    console.log('✅ Rôle mis à jour: OWNER');
    console.log(`💰 Coins: ${owner.coins}`);
    console.log(`💎 Gems: ${owner.gems}\n`);
  } else {
    console.error('❌ Compte non trouvé!');
    console.log(`Créez d'abord un compte avec le username: ${YOUR_USERNAME}`);
    console.log('Ou mettez CREATE_NEW_ACCOUNT = true dans le script\n');
    process.exit(1);
  }

  // 2. Vérifier si des salles existent déjà
  const existingRooms = await prisma.room.findMany({
    where: {
      name: {
        in: [
          '🏨 Hall d\'entrée',
          '🛋️ Salon Principal',
          '🏊 Piscine',
          '🎮 Salle de jeux',
          '🌃 Rooftop',
          '🏪 Boutique'
        ]
      }
    }
  });

  if (existingRooms.length > 0) {
    console.log(`⚠️  ${existingRooms.length} salles existent déjà`);
    console.log('Voulez-vous les recréer? Les anciennes seront supprimées.\n');
    
    // Pour le moment, on skip
    console.log('ℹ️  Les salles existantes sont conservées.');
    console.log('Pour les recréer, supprimez-les manuellement d\'abord.\n');
  } else {
    // 3. Créer les 6 salles Habbo Hotel
    console.log('🏗️  Création des salles Habbo Hotel...\n');

    const rooms = [
      {
        name: '🏨 Hall d\'entrée',
        description: 'Bienvenue dans UWorld! Le point de départ de votre aventure.',
        isPublic: true,
        isPrivate: false,
        maxUsers: 50,
        layout: 'habbo_hall',
        ownerId: owner.id,
      },
      {
        name: '🛋️ Salon Principal',
        description: 'Un grand salon confortable pour se détendre et discuter entre amis.',
        isPublic: true,
        isPrivate: false,
        maxUsers: 30,
        layout: 'habbo_lounge',
        ownerId: owner.id,
      },
      {
        name: '🏊 Piscine',
        description: 'Une magnifique piscine pour se rafraîchir! Attention, l\'eau est froide!',
        isPublic: true,
        isPrivate: false,
        maxUsers: 25,
        layout: 'habbo_pool',
        wallpaper: 'blue_waves',
        floor: 'pool_tiles',
        ownerId: owner.id,
      },
      {
        name: '🎮 Salle de jeux',
        description: 'Affrontez vos amis dans divers mini-jeux et remportez des prix!',
        isPublic: true,
        isPrivate: false,
        maxUsers: 20,
        layout: 'habbo_gameroom',
        wallpaper: 'arcade',
        floor: 'carpet_red',
        ownerId: owner.id,
      },
      {
        name: '🌃 Rooftop',
        description: 'Admirez la vue panoramique depuis le toit de l\'hôtel!',
        isPublic: true,
        isPrivate: false,
        maxUsers: 15,
        layout: 'habbo_rooftop',
        wallpaper: 'night_sky',
        floor: 'wooden_deck',
        ownerId: owner.id,
      },
      {
        name: '🏪 Boutique',
        description: 'Achetez des items, meubles et personnalisez votre avatar!',
        isPublic: true,
        isPrivate: false,
        maxUsers: 30,
        layout: 'habbo_shop',
        wallpaper: 'white_clean',
        floor: 'marble',
        ownerId: owner.id,
      },
    ];

    for (const roomData of rooms) {
      const room = await prisma.room.create({
        data: roomData
      });
      console.log(`✅ ${roomData.name} créée (ID: ${room.id})`);
    }

    console.log('\n🎉 Toutes les salles ont été créées!\n');
  }

  // 4. Résumé final
  console.log('=====================================');
  console.log('✅ Configuration terminée!\n');
  console.log(`👤 Owner: ${owner.username}`);
  console.log(`🆔 ID: ${owner.id}`);
  console.log(`👑 Rôle: ${owner.role}`);
  console.log(`💰 Coins: ${owner.coins}`);
  console.log(`💎 Gems: ${owner.gems}`);
  console.log(`⭐ Level: ${owner.level}`);
  
  const totalRooms = await prisma.room.count({
    where: { ownerId: owner.id }
  });
  console.log(`🏨 Salles possédées: ${totalRooms}`);
  
  console.log('\n📝 Prochaines étapes:');
  console.log('1. Connectez-vous avec votre compte');
  console.log('2. Explorez les nouvelles salles publiques');
  console.log('3. Profitez de vos privilèges owner! 👑\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });