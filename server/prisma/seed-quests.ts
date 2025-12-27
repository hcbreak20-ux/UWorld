import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, QuestType, ResetTime } from '@prisma/client';
// ... reste du fichier

const prisma = new PrismaClient();

async function seedQuests() {
  console.log('🌱 Seeding quêtes...');

  // ===== QUÊTES TUTORIAL =====
  
  const tutorialQuests = [
    {
      name: 'Premier Pas',
      description: 'Déplace-toi dans 5 cases différentes pour explorer la salle',
      type: QuestType.TUTORIAL,
      category: 'exploration',
      targetType: 'move_tiles',
      targetCount: 5,
      xpReward: 50,
      coinsReward: 100,
      resetTime: ResetTime.NEVER,
      order: 1,
    },
    {
      name: 'Social Butterfly',
      description: 'Envoie ton premier message dans le chat',
      type: QuestType.TUTORIAL,
      category: 'social',
      targetType: 'send_messages',
      targetCount: 1,
      xpReward: 25,
      coinsReward: 50,
      resetTime: ResetTime.NEVER,
      order: 2,
    },
    {
      name: 'Décorateur Débutant',
      description: 'Place ton premier meuble dans ta salle',
      type: QuestType.TUTORIAL,
      category: 'decoration',
      targetType: 'place_furniture',
      targetCount: 1,
      xpReward: 75,
      coinsReward: 150,
      itemReward: 'furniture_chair',
      resetTime: ResetTime.NEVER,
      order: 3,
    },
    {
      name: 'Maître de la Rotation',
      description: 'Fais pivoter un meuble 4 fois pour apprendre la rotation',
      type: QuestType.TUTORIAL,
      category: 'decoration',
      targetType: 'rotate_furniture',
      targetCount: 4,
      xpReward: 50,
      coinsReward: 75,
      resetTime: ResetTime.NEVER,
      order: 4,
    },
    {
      name: 'Explorateur',
      description: 'Visite 3 salles différentes pour découvrir le monde',
      type: QuestType.TUTORIAL,
      category: 'exploration',
      targetType: 'visit_rooms',
      targetCount: 3,
      xpReward: 100,
      coinsReward: 200,
      badgeReward: 'explorer',
      resetTime: ResetTime.NEVER,
      order: 5,
    },
    {
      name: 'Communicateur',
      description: 'Utilise les 3 modes de chat: parler, crier et chuchoter',
      type: QuestType.TUTORIAL,
      category: 'social',
      targetType: 'use_chat_modes',
      targetCount: 3,
      xpReward: 75,
      coinsReward: 150,
      resetTime: ResetTime.NEVER,
      order: 6,
    },
    {
      name: 'Ami du Monde',
      description: 'Consulte le profil de 3 joueurs différents',
      type: QuestType.TUTORIAL,
      category: 'social',
      targetType: 'view_profiles',
      targetCount: 3,
      xpReward: 50,
      coinsReward: 100,
      resetTime: ResetTime.NEVER,
      order: 7,
    },
  ];

  // ===== QUÊTES QUOTIDIENNES =====
  
  const dailyQuests = [
    {
      name: 'Connexion Quotidienne',
      description: 'Connecte-toi au jeu pour récupérer ta récompense quotidienne',
      type: QuestType.DAILY,
      category: 'time',
      targetType: 'daily_login',
      targetCount: 1,
      xpReward: 25,
      coinsReward: 50,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Bavard',
      description: 'Envoie 10 messages dans le chat',
      type: QuestType.DAILY,
      category: 'social',
      targetType: 'send_messages',
      targetCount: 10,
      xpReward: 50,
      coinsReward: 75,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Nomade',
      description: 'Visite 5 salles différentes',
      type: QuestType.DAILY,
      category: 'exploration',
      targetType: 'visit_rooms',
      targetCount: 5,
      xpReward: 75,
      coinsReward: 100,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Décorateur du Jour',
      description: 'Place ou déplace 3 meubles',
      type: QuestType.DAILY,
      category: 'decoration',
      targetType: 'place_furniture',
      targetCount: 3,
      xpReward: 50,
      coinsReward: 75,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Social',
      description: 'Discute avec 3 joueurs différents',
      type: QuestType.DAILY,
      category: 'social',
      targetType: 'chat_with_players',
      targetCount: 3,
      xpReward: 100,
      coinsReward: 150,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Architecte',
      description: 'Ramasse et replace 5 meubles',
      type: QuestType.DAILY,
      category: 'decoration',
      targetType: 'pickup_furniture',
      targetCount: 5,
      xpReward: 150,
      coinsReward: 200,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Grand Communicateur',
      description: 'Envoie 50 messages dans le chat',
      type: QuestType.DAILY,
      category: 'social',
      targetType: 'send_messages',
      targetCount: 50,
      xpReward: 200,
      coinsReward: 300,
      resetTime: ResetTime.DAILY,
    },
    {
      name: 'Temps Passé',
      description: 'Reste connecté pendant 30 minutes',
      type: QuestType.DAILY,
      category: 'time',
      targetType: 'time_online',
      targetCount: 30, // en minutes
      xpReward: 100,
      coinsReward: 150,
      resetTime: ResetTime.DAILY,
    },
  ];

  // ===== QUÊTES HEBDOMADAIRES =====
  
  const weeklyQuests = [
    {
      name: 'Série de Connexions',
      description: 'Connecte-toi 5 jours sur 7 cette semaine',
      type: QuestType.WEEKLY,
      category: 'time',
      targetType: 'login_days',
      targetCount: 5,
      xpReward: 500,
      coinsReward: 1000,
      badgeReward: 'dedicated',
      resetTime: ResetTime.WEEKLY,
    },
    {
      name: 'Roi de la Déco',
      description: 'Place 50 meubles au total cette semaine',
      type: QuestType.WEEKLY,
      category: 'decoration',
      targetType: 'place_furniture',
      targetCount: 50,
      xpReward: 750,
      coinsReward: 1500,
      itemReward: 'furniture_rare_throne',
      resetTime: ResetTime.WEEKLY,
    },
    {
      name: 'Marathonien',
      description: 'Passe 5 heures total en jeu cette semaine',
      type: QuestType.WEEKLY,
      category: 'time',
      targetType: 'time_online',
      targetCount: 300, // en minutes
      xpReward: 600,
      coinsReward: 800,
      resetTime: ResetTime.WEEKLY,
    },
    {
      name: 'Maître Social',
      description: 'Discute avec 20 joueurs différents',
      type: QuestType.WEEKLY,
      category: 'social',
      targetType: 'chat_with_players',
      targetCount: 20,
      xpReward: 800,
      coinsReward: 1200,
      badgeReward: 'social_master',
      resetTime: ResetTime.WEEKLY,
    },
    {
      name: 'Grand Explorateur',
      description: 'Visite 30 salles différentes',
      type: QuestType.WEEKLY,
      category: 'exploration',
      targetType: 'visit_rooms',
      targetCount: 30,
      xpReward: 1000,
      coinsReward: 2000,
      itemReward: 'furniture_unique_compass',
      resetTime: ResetTime.WEEKLY,
    },
  ];

  // ===== QUÊTES CACHÉES =====
  
  const hiddenQuests = [
    {
      name: 'Noctambule',
      description: 'Connecte-toi entre 3h et 4h du matin',
      type: QuestType.HIDDEN,
      category: 'time',
      targetType: 'login_late_night',
      targetCount: 1,
      xpReward: 500,
      coinsReward: 750,
      badgeReward: 'night_owl',
      resetTime: ResetTime.NEVER,
    },
    {
      name: 'Minimaliste',
      description: 'Aie une salle avec exactement 1 seul meuble',
      type: QuestType.HIDDEN,
      category: 'decoration',
      targetType: 'room_one_furniture',
      targetCount: 1,
      xpReward: 200,
      coinsReward: 300,
      badgeReward: 'zen',
      resetTime: ResetTime.NEVER,
    },
    {
      name: 'Maximalist',
      description: 'Remplis une salle avec 50 meubles',
      type: QuestType.HIDDEN,
      category: 'decoration',
      targetType: 'room_fifty_furniture',
      targetCount: 1,
      xpReward: 500,
      coinsReward: 1000,
      badgeReward: 'hoarder',
      resetTime: ResetTime.NEVER,
    },
  ];

  // Insérer toutes les quêtes
  const allQuests = [...tutorialQuests, ...dailyQuests, ...weeklyQuests, ...hiddenQuests];

  for (const quest of allQuests) {
    await prisma.quest.upsert({
      where: { 
        // Utiliser name comme unique identifier pour upsert
        name: quest.name 
      },
      update: quest,
      create: quest,
    });
  }

  console.log(`✅ ${allQuests.length} quêtes créées/mises à jour`);
  console.log(`   - ${tutorialQuests.length} quêtes tutorial`);
  console.log(`   - ${dailyQuests.length} quêtes quotidiennes`);
  console.log(`   - ${weeklyQuests.length} quêtes hebdomadaires`);
  console.log(`   - ${hiddenQuests.length} quêtes cachées`);
}

async function main() {
  try {
    await seedQuests();
    console.log('✅ Seed terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
