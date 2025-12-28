const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const badges = [
  // ============================================
  // BADGES DE BIENVENUE
  // ============================================
  {
    key: 'first_login',
    name: 'Premier Pas',
    description: 'Connectez-vous pour la première fois',
    icon: '👋',
    category: 'welcome',
    rarity: 'common'
  },
  {
    key: 'chat_beginner',
    name: 'Bavard',
    description: 'Envoyez 10 messages',
    icon: '💬',
    category: 'welcome',
    rarity: 'common'
  },
  {
    key: 'explorer',
    name: 'Explorateur',
    description: 'Visitez 5 salles différentes',
    icon: '🚀',
    category: 'welcome',
    rarity: 'common'
  },

  // ============================================
  // BADGES DE PROGRESSION
  // ============================================
  {
    key: 'level_5',
    name: 'Débutant',
    description: 'Atteignez le niveau 5',
    icon: '⭐',
    category: 'progression',
    rarity: 'common'
  },
  {
    key: 'level_10',
    name: 'Intermédiaire',
    description: 'Atteignez le niveau 10',
    icon: '🌟',
    category: 'progression',
    rarity: 'rare'
  },
  {
    key: 'level_25',
    name: 'Expert',
    description: 'Atteignez le niveau 25',
    icon: '💫',
    category: 'progression',
    rarity: 'epic'
  },
  {
    key: 'level_50',
    name: 'Maître',
    description: 'Atteignez le niveau 50',
    icon: '✨',
    category: 'progression',
    rarity: 'legendary'
  },

  // ============================================
  // BADGES SOCIAUX
  // ============================================
  {
    key: 'chat_master',
    name: 'Maître du Chat',
    description: 'Envoyez 100 messages',
    icon: '💭',
    category: 'social',
    rarity: 'rare'
  },
  {
    key: 'social_butterfly',
    name: 'Papillon Social',
    description: 'Ayez 5 amis',
    icon: '👥',
    category: 'social',
    rarity: 'rare'
  },
  {
    key: 'popular',
    name: 'Populaire',
    description: 'Recevez 50 messages',
    icon: '🎉',
    category: 'social',
    rarity: 'epic'
  },

  // ============================================
  // BADGES DE COLLECTION
  // ============================================
  {
    key: 'decorator',
    name: 'Décorateur',
    description: 'Placez 20 meubles',
    icon: '🏠',
    category: 'collection',
    rarity: 'rare'
  },
  {
    key: 'rich',
    name: 'Riche',
    description: 'Accumulez 10,000 uCoins',
    icon: '💰',
    category: 'collection',
    rarity: 'epic'
  },
  {
    key: 'millionaire',
    name: 'Millionnaire',
    description: 'Accumulez 100,000 uCoins',
    icon: '💎',
    category: 'collection',
    rarity: 'legendary'
  },

  // ============================================
  // BADGES SPÉCIAUX
  // ============================================
  {
    key: 'loyal',
    name: 'Fidèle',
    description: 'Connectez-vous 7 jours d\'affilée',
    icon: '🎂',
    category: 'special',
    rarity: 'epic'
  },
  {
    key: 'night_owl',
    name: 'Oiseau de Nuit',
    description: 'Connectez-vous entre minuit et 6h',
    icon: '🌙',
    category: 'special',
    rarity: 'rare'
  },
  {
    key: 'early_bird',
    name: 'Lève-Tôt',
    description: 'Connectez-vous entre 5h et 8h',
    icon: '🌅',
    category: 'special',
    rarity: 'rare'
  },
  {
    key: 'veteran',
    name: 'Vétéran',
    description: 'Compte créé depuis plus de 30 jours',
    icon: '🏆',
    category: 'special',
    rarity: 'legendary'
  }
];

async function seedBadges() {
  console.log('🌱 Seed des badges...');

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: badge,
      create: badge,
    });
    console.log(`✅ Badge créé/mis à jour: ${badge.name} (${badge.key})`);
  }

  console.log(`\n🎉 ${badges.length} badges créés avec succès!`);
  
  // Afficher un résumé par catégorie
  const summary = badges.reduce((acc, badge) => {
    acc[badge.category] = (acc[badge.category] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Résumé par catégorie:');
  Object.entries(summary).forEach(([category, count]) => {
    console.log(`  - ${category}: ${count} badges`);
  });

  await prisma.$disconnect();
}

seedBadges().catch((error) => {
  console.error('❌ Erreur lors du seed:', error);
  process.exit(1);
});
