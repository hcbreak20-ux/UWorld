import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBadges() {
  console.log('🏅 Création des badges par défaut...\n');
  
  const badges = [
    // Badges VIP
    {
      code: 'vip_2024',
      name: 'VIP 2024',
      description: 'Membre VIP de 2024',
      imageUrl: '/badges/vip_2024.png',
      isAdminOnly: false
    },
    {
      code: 'vip_lifetime',
      name: 'VIP à vie',
      description: 'VIP permanent',
      imageUrl: '/badges/vip_lifetime.png',
      isAdminOnly: false
    },
    
    // Badges Staff
    {
      code: 'staff',
      name: 'Membre du Staff',
      description: 'Fait partie de l\'équipe',
      imageUrl: '/badges/staff.png',
      isAdminOnly: true
    },
    {
      code: 'moderator',
      name: 'Modérateur',
      description: 'Modérateur du jeu',
      imageUrl: '/badges/moderator.png',
      isAdminOnly: true
    },
    {
      code: 'admin',
      name: 'Administrateur',
      description: 'Administrateur du jeu',
      imageUrl: '/badges/admin.png',
      isAdminOnly: true
    },
    {
      code: 'founder',
      name: 'Fondateur',
      description: 'Fondateur du jeu',
      imageUrl: '/badges/founder.png',
      isAdminOnly: true
    },
    
    // Badges Événements
    {
      code: 'event_summer_2024',
      name: 'Événement Été 2024',
      description: 'A participé à l\'événement d\'été 2024',
      imageUrl: '/badges/summer_2024.png',
      isAdminOnly: false
    },
    {
      code: 'event_halloween_2024',
      name: 'Halloween 2024',
      description: 'A participé à Halloween 2024',
      imageUrl: '/badges/halloween_2024.png',
      isAdminOnly: false
    },
    {
      code: 'event_christmas_2024',
      name: 'Noël 2024',
      description: 'A participé à Noël 2024',
      imageUrl: '/badges/christmas_2024.png',
      isAdminOnly: false
    },
    {
      code: 'event_newyear_2025',
      name: 'Nouvel An 2025',
      description: 'A participé au Nouvel An 2025',
      imageUrl: '/badges/newyear_2025.png',
      isAdminOnly: false
    },
    
    // Badges Réalisations
    {
      code: 'beta_tester',
      name: 'Testeur Beta',
      description: 'A participé à la beta',
      imageUrl: '/badges/beta.png',
      isAdminOnly: false
    },
    {
      code: 'first_100',
      name: 'Top 100',
      description: 'Parmi les 100 premiers joueurs',
      imageUrl: '/badges/first_100.png',
      isAdminOnly: false
    },
    {
      code: 'millionaire',
      name: 'Millionnaire',
      description: 'A possédé 1 000 000 uCoins',
      imageUrl: '/badges/millionaire.png',
      isAdminOnly: false
    },
    {
      code: 'level_50',
      name: 'Niveau 50',
      description: 'A atteint le niveau 50',
      imageUrl: '/badges/level_50.png',
      isAdminOnly: false
    },
    {
      code: 'level_100',
      name: 'Niveau 100',
      description: 'A atteint le niveau 100',
      imageUrl: '/badges/level_100.png',
      isAdminOnly: false
    },
    
    // Badges Spéciaux
    {
      code: 'helper',
      name: 'Helper',
      description: 'Aide les nouveaux joueurs',
      imageUrl: '/badges/helper.png',
      isAdminOnly: false
    },
    {
      code: 'builder',
      name: 'Constructeur',
      description: 'A créé des salles exceptionnelles',
      imageUrl: '/badges/builder.png',
      isAdminOnly: false
    },
    {
      code: 'social_butterfly',
      name: 'Papillon Social',
      description: 'A plus de 100 amis',
      imageUrl: '/badges/social.png',
      isAdminOnly: false
    },
    {
      code: 'artist',
      name: 'Artiste',
      description: 'Contribution artistique au jeu',
      imageUrl: '/badges/artist.png',
      isAdminOnly: false
    },
    {
      code: 'veteran',
      name: 'Vétéran',
      description: 'Joue depuis plus d\'1 an',
      imageUrl: '/badges/veteran.png',
      isAdminOnly: false
    }
  ];
  
  let created = 0;
  let existing = 0;
  
  for (const badge of badges) {
    try {
      await prisma.badge.upsert({
        where: { code: badge.code },
        update: {
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          isAdminOnly: badge.isAdminOnly
        },
        create: badge
      });
      
      const existingBadge = await prisma.badge.findUnique({
        where: { code: badge.code }
      });
      
      if (existingBadge) {
        existing++;
        console.log(`✅ Badge mis à jour: ${badge.name}`);
      } else {
        created++;
        console.log(`✨ Badge créé: ${badge.name}`);
      }
    } catch (error) {
      console.error(`❌ Erreur avec le badge ${badge.code}:`, error);
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`   - ${created} badges créés`);
  console.log(`   - ${existing} badges mis à jour`);
  console.log(`   - ${badges.length} badges au total\n`);
  console.log('✅ Badges par défaut créés avec succès!');
}

seedBadges()
  .catch((error) => {
    console.error('❌ Erreur lors de la création des badges:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
