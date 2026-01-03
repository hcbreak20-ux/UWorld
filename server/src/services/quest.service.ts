import { prisma } from '../lib/prisma';
import { levelService } from './level.service';

export class QuestService {
  /**
   * Assigner toutes les quêtes tutorial à un nouveau joueur
   */
  async assignTutorialQuests(userId: string) {
    try {
      const tutorialQuests = await prisma.quest.findMany({
        where: {
          type: 'tutorial',
          isActive: true,
        },
      });

      const userQuests = tutorialQuests.map((quest) => ({
        userId: parseInt(userId),
        questId: quest.id,
        progress: 0,
        isCompleted: false,
      }));

      await prisma.userQuest.createMany({
        data: userQuests,
        skipDuplicates: true,
      });

      console.log(`✅ ${userQuests.length} quêtes tutorial assignées`);
      return userQuests;
    } catch (error) {
      console.error('Erreur assignation tutorial:', error);
      throw error;
    }
  }

  /**
   * Assigner les quêtes daily/weekly à un joueur
   */
  async assignDailyWeeklyQuests(userId: string) {
    try {
      const quests = await prisma.quest.findMany({
        where: {
          type: { in: ['daily', 'weekly'] },
          isActive: true,
        },
      });

      for (const quest of quests) {
        await prisma.userQuest.upsert({
          where: {
            userId_questId: {
              userId: parseInt(userId),
              questId: quest.id,
            },
          },
          update: {},
          create: {
            userId: parseInt(userId),
            questId: quest.id,
            progress: 0,
            isCompleted: false,
          },
        });
      }

      console.log(`✅ Quêtes daily/weekly assignées`);
    } catch (error) {
      console.error('Erreur assignation daily/weekly:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les quêtes d'un joueur
   */
  async getUserQuests(userId: string) {
    try {
      const userQuests = await prisma.userQuest.findMany({
        where: { userId: parseInt(userId) },
        include: {
          quest: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return userQuests;
    } catch (error) {
      console.error('Erreur récupération quêtes:', error);
      throw error;
    }
  }

  /**
   * Tracker la progression d'une quête
   */
  async trackProgress(userId: string, targetType: string, increment: number = 1) {
    try {
      // Trouver les quêtes correspondantes (basé sur la description ou title)
      const quests = await prisma.quest.findMany({
        where: {
          isActive: true,
          OR: [
            { description: { contains: targetType } },
            { title: { contains: targetType } }
          ]
        },
      });

      if (quests.length === 0) return;

      for (const quest of quests) {
        // Récupérer le targetCount depuis reward JSON
        const reward = quest.reward as any;
        const targetCount = reward?.targetCount || 10;

        const userQuest = await prisma.userQuest.findUnique({
          where: {
            userId_questId: {
              userId: parseInt(userId),
              questId: quest.id,
            },
          },
        });

        if (!userQuest) {
          await prisma.userQuest.create({
            data: {
              userId: parseInt(userId),
              questId: quest.id,
              progress: increment,
              isCompleted: increment >= targetCount,
              completedAt: increment >= targetCount ? new Date() : null,
            },
          });
          continue;
        }

        if (userQuest.isCompleted) continue;

        const newProgress = userQuest.progress + increment;
        const isCompleted = newProgress >= targetCount;

        await prisma.userQuest.update({
          where: { id: userQuest.id },
          data: {
            progress: newProgress,
            isCompleted: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });

        console.log(`📊 Progression: ${quest.title} → ${newProgress}/${targetCount}`);

        if (isCompleted && !userQuest.isCompleted) {
          console.log(`🎉 Quête complétée: ${quest.title}`);
        }
      }
    } catch (error) {
      console.error('Erreur tracking:', error);
    }
  }

  /**
   * Tracker les modes de chat
   */
  async trackChatMode(userId: string, chatMode: 'normal' | 'shout' | 'whisper') {
    try {
      await this.trackProgress(userId, 'chat_modes', 1);
    } catch (error) {
      console.error('Erreur trackChatMode:', error);
    }
  }

  /**
   * Tracker les jours de connexion
   */
  async trackLoginDay(userId: string) {
    try {
      await this.trackProgress(userId, 'login_days', 1);
    } catch (error) {
      console.error('Erreur trackLoginDay:', error);
    }
  }

  /**
   * Tracker le temps en ligne
   */
  async trackTimeOnline(userId: string, minutes: number = 1) {
    try {
      await this.trackProgress(userId, 'time_online', minutes);
    } catch (error) {
      console.error('Erreur trackTimeOnline:', error);
    }
  }

  /**
   * Réclamer la récompense d'une quête
   */
  async claimReward(userId: string, questId: number) {
    try {
      const userQuest = await prisma.userQuest.findUnique({
        where: {
          userId_questId: {
            userId: parseInt(userId),
            questId: questId,
          },
        },
        include: {
          quest: true,
          user: true,
        },
      });

      if (!userQuest) {
        throw new Error('Quête non trouvée');
      }

      if (!userQuest.isCompleted) {
        throw new Error('Quête non complétée');
      }

      // Récupérer les récompenses depuis le JSON
      const reward = userQuest.quest.reward as any;
      const coins = reward?.coins || 0;
      const experience = reward?.experience || 0;

      // Donner les coins
      if (coins > 0) {
        await prisma.user.update({
          where: { id: parseInt(userId) },
          data: {
            coins: { increment: coins },
          },
        });
      }

      // Ajouter l'XP
      let levelResult = null;
      if (experience > 0) {
        levelResult = await levelService.addXp(userId, experience);
      }

      // Supprimer la quête (ou marquer comme réclamée si tu veux garder l'historique)
      await prisma.userQuest.delete({
        where: { id: userQuest.id },
      });

      console.log(`🎁 Récompense réclamée: ${userQuest.quest.title} → ${experience} XP + ${coins} coins`);

      if (levelResult?.leveledUp) {
        console.log(`🎊 ${userQuest.user.username} a atteint le niveau ${levelResult.newLevel}!`);
      }

      return {
        xp: experience,
        coins: coins,
        levelUp: levelResult?.leveledUp ? {
          oldLevel: levelResult.oldLevel,
          newLevel: levelResult.newLevel,
        } : null,
      };
    } catch (error) {
      console.error('Erreur réclamation récompense:', error);
      throw error;
    }
  }

  /**
   * Reset les quêtes daily
   */
  async resetDailyQuests() {
    try {
      const dailyQuests = await prisma.quest.findMany({
        where: {
          type: 'daily',
          isActive: true,
        },
      });

      for (const quest of dailyQuests) {
        await prisma.userQuest.updateMany({
          where: { questId: quest.id },
          data: {
            progress: 0,
            isCompleted: false,
            completedAt: null,
          },
        });
      }

      console.log(`🔄 ${dailyQuests.length} quêtes daily reset`);
    } catch (error) {
      console.error('Erreur reset daily:', error);
    }
  }

  /**
   * Reset les quêtes weekly
   */
  async resetWeeklyQuests() {
    try {
      const weeklyQuests = await prisma.quest.findMany({
        where: {
          type: 'weekly',
          isActive: true,
        },
      });

      for (const quest of weeklyQuests) {
        await prisma.userQuest.updateMany({
          where: { questId: quest.id },
          data: {
            progress: 0,
            isCompleted: false,
            completedAt: null,
          },
        });
      }

      console.log(`🔄 ${weeklyQuests.length} quêtes weekly reset`);
    } catch (error) {
      console.error('Erreur reset weekly:', error);
    }
  }

  /**
   * Assigner les quêtes manquantes
   */
  async ensureUserHasQuests(userId: string) {
    try {
      const tutorialCount = await prisma.userQuest.count({
        where: {
          userId: parseInt(userId),
          quest: { type: 'tutorial' },
        },
      });

      if (tutorialCount === 0) {
        await this.assignTutorialQuests(userId);
      }

      await this.assignDailyWeeklyQuests(userId);
    } catch (error) {
      console.error('Erreur assignation quêtes:', error);
    }
  }
}

export const questService = new QuestService();