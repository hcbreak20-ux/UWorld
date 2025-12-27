import { PrismaClient, QuestType, ResetTime } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed de la base de données...');

  // ============================================
  // 1. CRÉER L'UTILISATEUR SYSTÈME
  // ============================================
  console.log('👤 Création de l\'utilisateur système...');
  
  const systemUser = await prisma.user.upsert({
    where: { username: 'system' },
    update: {},
    create: {
      username: 'system',
      email: 'system@uworld.com',
      password: '$2b$10$impossiblePasswordHashThatWontWork',
      isAdmin: true,
      motto: 'Système UWorld',
    },
  });

  console.log('✅ Utilisateur système créé:', systemUser.username);

  // ============================================
  // 2. CRÉER LES QUÊTES TUTORIAL
  // ============================================
  console.log('📋 Création des quêtes TUTORIAL...');

  const tutorialQuests = [
    {
      name: 'Bienvenue dans UWorld',
      description: 'Connecte-toi au jeu pour la première fois',
      type: QuestType.TUTORIAL,
      category: 'exploration',
      targetType: 'first_login',
      targetCount: 1,
      resetTime: ResetTime.NEVER,
      xpReward: 50,
      coinsReward: 100,
      order: 1,
      isActive: true,
    },
    {
      name: 'Explorateur Débutant',
      description: 'Visite 3 salles différentes',
      type: QuestType.TUTORIAL,
      category: 'exploration',
      targetType: 'visit_rooms',
      targetCount: 3,
      resetTime: ResetTime.NEVER,
      xpReward: 75,
      coinsReward: 150,
      order: 2,
      isActive: true,
    },
    {
      name: 'Social Butterfly',
      description: 'Envoie 10 messages dans le chat',
      type: QuestType.TUTORIAL,
      category: 'social',
      targetType: 'send_messages',
      targetCount: 10,
      resetTime: ResetTime.NEVER,
      xpReward: 100,
      coinsReward: 200,
      order: 3,
      isActive: true,
    },
    {
      name: 'Personnalisation',
      description: 'Change ton avatar pour la première fois',
      type: QuestType.TUTORIAL,
      category: 'decoration',
      targetType: 'change_avatar',
      targetCount: 1,
      resetTime: ResetTime.NEVER,
      xpReward: 50,
      coinsReward: 100,
      order: 4,
      isActive: true,
    },
  ];

  for (const quest of tutorialQuests) {
    await prisma.quest.upsert({
      where: { name: quest.name },
      update: {},
      create: quest,
    });
  }

  console.log(`✅ ${tutorialQuests.length} quêtes TUTORIAL créées`);

  // ============================================
  // 3. CRÉER LES QUÊTES DAILY
  // ============================================
  console.log('📅 Création des quêtes DAILY...');

  const dailyQuests = [
    {
      name: 'Connexion Quotidienne',
      description: 'Connecte-toi au jeu aujourd\'hui',
      type: QuestType.DAILY,
      category: 'time',
      resetTime: ResetTime.DAILY,
      targetType: 'daily_login',
      targetCount: 1,
      xpReward: 25,
      coinsReward: 50,
      order: 1,
      isActive: true,
    },
    {
      name: 'Bavard du Jour',
      description: 'Envoie 20 messages dans le chat',
      type: QuestType.DAILY,
      category: 'social',
      resetTime: ResetTime.DAILY,
      targetType: 'send_messages',
      targetCount: 20,
      xpReward: 50,
      coinsReward: 100,
      order: 2,
      isActive: true,
    },
    {
      name: 'Temps Passé',
      description: 'Reste en ligne pendant 30 minutes',
      type: QuestType.DAILY,
      category: 'time',
      resetTime: ResetTime.DAILY,
      targetType: 'time_online',
      targetCount: 30,
      xpReward: 75,
      coinsReward: 150,
      order: 3,
      isActive: true,
    },
    {
      name: 'Communicateur',
      description: 'Utilise les 3 modes de chat (normal, shout, whisper)',
      type: QuestType.DAILY,
      category: 'social',
      resetTime: ResetTime.DAILY,
      targetType: 'use_chat_modes',
      targetCount: 3,
      xpReward: 100,
      coinsReward: 200,
      order: 4,
      isActive: true,
    },
  ];

  for (const quest of dailyQuests) {
    await prisma.quest.upsert({
      where: { name: quest.name },
      update: {},
      create: quest,
    });
  }

  console.log(`✅ ${dailyQuests.length} quêtes DAILY créées`);

  // ============================================
  // 4. CRÉER LES QUÊTES WEEKLY
  // ============================================
  console.log('📆 Création des quêtes WEEKLY...');

  const weeklyQuests = [
    {
      name: 'Série de Connexions',
      description: 'Connecte-toi 5 jours différents cette semaine',
      type: QuestType.WEEKLY,
      category: 'time',
      resetTime: ResetTime.WEEKLY,
      targetType: 'login_days',
      targetCount: 5,
      xpReward: 200,
      coinsReward: 500,
      order: 1,
      isActive: true,
    },
    {
      name: 'Super Social',
      description: 'Envoie 100 messages cette semaine',
      type: QuestType.WEEKLY,
      category: 'social',
      resetTime: ResetTime.WEEKLY,
      targetType: 'send_messages',
      targetCount: 100,
      xpReward: 250,
      coinsReward: 600,
      order: 2,
      isActive: true,
    },
    {
      name: 'Marathonien',
      description: 'Passe 5 heures en ligne cette semaine',
      type: QuestType.WEEKLY,
      category: 'time',
      resetTime: ResetTime.WEEKLY,
      targetType: 'time_online',
      targetCount: 300,
      xpReward: 300,
      coinsReward: 750,
      order: 3,
      isActive: true,
    },
  ];

  for (const quest of weeklyQuests) {
    await prisma.quest.upsert({
      where: { name: quest.name },
      update: {},
      create: quest,
    });
  }

  console.log(`✅ ${weeklyQuests.length} quêtes WEEKLY créées`);

  // ============================================
  // 5. CRÉER LES SALLES PUBLIQUES
  // ============================================
  console.log('🏠 Création des salles publiques...');

  const publicRooms = [
    {
      name: 'Lobby Principal',
      description: 'Salle de bienvenue - Discutez et explorez! 🎮',
      isPublic: true,
      maxUsers: 50,
      floor: 'checkered_blue',
      wallpaper: 'blue',
      ownerId: systemUser.id,
    },
    {
      name: 'Parc Public',
      description: 'Un espace vert pour se promener et se détendre 🌳',
      isPublic: true,
      maxUsers: 30,
      floor: 'grass',
      wallpaper: 'sky',
      ownerId: systemUser.id,
    },
    {
      name: 'Place du Marché',
      description: 'Échangez et discutez avec d\'autres joueurs 🏪',
      isPublic: true,
      maxUsers: 40,
      floor: 'stone',
      wallpaper: 'brick',
      ownerId: systemUser.id,
    },
  ];

  for (const room of publicRooms) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
  }

  console.log(`✅ ${publicRooms.length} salles publiques créées`);

  // ============================================
  // RÉSUMÉ
  // ============================================
  console.log('\n🎉 SEED TERMINÉ AVEC SUCCÈS!');
  console.log('===============================');
  console.log(`✅ Utilisateur système: 1`);
  console.log(`✅ Quêtes TUTORIAL: ${tutorialQuests.length}`);
  console.log(`✅ Quêtes DAILY: ${dailyQuests.length}`);
  console.log(`✅ Quêtes WEEKLY: ${weeklyQuests.length}`);
  console.log(`✅ Salles publiques: ${publicRooms.length}`);
  console.log(`📊 Total quêtes: ${tutorialQuests.length + dailyQuests.length + weeklyQuests.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });