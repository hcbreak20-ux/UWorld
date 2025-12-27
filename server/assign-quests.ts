import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignQuestsToAllUsers() {
  try {
    console.log('🔍 Recherche de tous les utilisateurs...');
    
    const users = await prisma.user.findMany({
      select: { id: true, username: true },
    });

    const quests = await prisma.quest.findMany({
      where: { isActive: true },
    });

    console.log(`📊 ${users.length} utilisateur(s) trouvé(s)`);
    console.log(`📋 ${quests.length} quêtes actives\n`);

    for (const user of users) {
      console.log(`👤 Assignation pour ${user.username}...`);
      
      for (const quest of quests) {
        await prisma.userQuest.upsert({
          where: {
            userId_questId: {
              userId: user.id,
              questId: quest.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            questId: quest.id,
            progress: 0,
            completed: false,
            rewardClaimed: false,
          },
        });
      }
      
      console.log(`   ✅ ${quests.length} quêtes assignées!\n`);
    }

    console.log(`\n🎉 Terminé! ${users.length} utilisateur(s) ont leurs quêtes!`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignQuestsToAllUsers();
