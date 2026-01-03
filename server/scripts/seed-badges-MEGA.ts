import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏅 Création des badges...');

  const badges = [
    // VIP Badges
    {
      key: 'vip_2024',
      name: 'VIP 2024',
      description: 'Membre VIP de l\'année 2024',
      icon: '💎',
      category: 'vip',
      rarity: 'epic',
      isAdminOnly: false
    },
    {
      key: 'vip_lifetime',
      name: 'VIP Lifetime',
      description: 'Membre VIP à vie',
      icon: '👑',
      category: 'vip',
      rarity: 'legendary',
      isAdminOnly: false
    },

    // Staff Badges
    {
      key: 'staff',
      name: 'Staff',
      description: 'Membre de l\'équipe UWorld',
      icon: '🛡️',
      category: 'staff',
      rarity: 'epic',
      isAdminOnly: true
    },
    {
      key: 'moderator',
      name: 'Modérateur',
      description: 'Modérateur UWorld',
      icon: '🔨',
      category: 'staff',
      rarity: 'epic',
      isAdminOnly: true
    },
    {
      key: 'admin',
      name: 'Administrateur',
      description: 'Administrateur UWorld',
      icon: '⚡',
      category: 'staff',
      rarity: 'legendary',
      isAdminOnly: true
    },
    {
      key: 'founder',
      name: 'Fondateur',
      description: 'Fondateur d\'UWorld',
      icon: '⭐',
      category: 'staff',
      rarity: 'legendary',
      isAdminOnly: true
    },

    // Event Badges
    {
      key: 'summer_2024',
      name: 'Été 2024',
      description: 'Participant à l\'événement Été 2024',
      icon: '☀️',
      category: 'event',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'halloween_2024',
      name: 'Halloween 2024',
      description: 'Participant à Halloween 2024',
      icon: '🎃',
      category: 'event',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'christmas_2024',
      name: 'Noël 2024',
      description: 'Participant à Noël 2024',
      icon: '🎄',
      category: 'event',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'newyear_2025',
      name: 'Nouvel An 2025',
      description: 'Célébration du Nouvel An 2025',
      icon: '🎆',
      category: 'event',
      rarity: 'rare',
      isAdminOnly: false
    },

    // Achievement Badges
    {
      key: 'beta_tester',
      name: 'Beta Tester',
      description: 'A participé à la beta d\'UWorld',
      icon: '🧪',
      category: 'achievement',
      rarity: 'epic',
      isAdminOnly: false
    },
    {
      key: 'first_100',
      name: 'Top 100',
      description: 'Parmi les 100 premiers joueurs',
      icon: '🥇',
      category: 'achievement',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'millionaire',
      name: 'Millionnaire',
      description: 'Posséder 1 000 000 uCoins',
      icon: '💰',
      category: 'achievement',
      rarity: 'epic',
      isAdminOnly: false
    },
    {
      key: 'level_50',
      name: 'Niveau 50',
      description: 'Atteindre le niveau 50',
      icon: '🔥',
      category: 'achievement',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'level_100',
      name: 'Niveau 100',
      description: 'Atteindre le niveau 100',
      icon: '💯',
      category: 'achievement',
      rarity: 'legendary',
      isAdminOnly: false
    },

    // Special Badges
    {
      key: 'helper',
      name: 'Assistant',
      description: 'Aide activement la communauté',
      icon: '🤝',
      category: 'special',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'builder',
      name: 'Constructeur',
      description: 'Créateur de salles exceptionnelles',
      icon: '🏗️',
      category: 'special',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'social_butterfly',
      name: 'Papillon Social',
      description: 'Plus de 100 amis',
      icon: '🦋',
      category: 'special',
      rarity: 'rare',
      isAdminOnly: false
    },
    {
      key: 'artist',
      name: 'Artiste',
      description: 'Créateur de contenu reconnu',
      icon: '🎨',
      category: 'special',
      rarity: 'epic',
      isAdminOnly: false
    },
    {
      key: 'veteran',
      name: 'Vétéran',
      description: 'Plus d\'un an sur UWorld',
      icon: '🏆',
      category: 'special',
      rarity: 'epic',
      isAdminOnly: false
    }
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: badge,
      create: badge
    });
    console.log(`✅ Badge créé: ${badge.name}`);
  }

  console.log('\n🎉 Tous les badges ont été créés!');
  console.log(`📊 Total: ${badges.length} badges`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
