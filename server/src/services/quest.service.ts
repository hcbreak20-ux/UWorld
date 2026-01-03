import { QuestType } from '@prisma/client';
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
          type: QuestType.TUTORIAL,
          isActive: true,
        },
      });

      const userQuests = tutorialQuests.map((quest) => ({
        userId: userId,
        questId: quest.id,
        progress: 0,
        completed: false,
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
          type: { in: [QuestType.DAILY, QuestType.WEEKLY] },
          isActive: true,
        },
      });

      for (const quest of quests) {
        await prisma.userQuest.upsert({
          include: { quest: true, user: true },
        where: {
            userId_questId: {
              userId: userId,
              questId: quest.id,
            },
          },
          update: {},
          create: {
            userId: userId,
            questId: quest.id,
            progress: 0,
            completed: false,
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
        include: { quest: true, user: true },
        where: { userId: userId },
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
            { name: { contains: targetType } }
          ]
        },
      });

      if (quests.length === 0) return;

      for (const quest of quests) {
        // Récupérer le targetCount depuis reward JSON
        const reward = quest.reward as any;
        const targetCount = reward?.targetCount || 10;

        const userQuest = await prisma.userQuest.findUnique({
          include: { quest: true, user: true },
        where: {
            userId_questId: {
              userId: userId,
              questId: quest.id,
            },
          },
        });

        if (!userQuest) {
          await prisma.userQuest.create({
            data: {
              userId: userId,
              questId: quest.id,
              progress: increment,
              completed: increment >= targetCount,
              completedAt: increment >= targetCount ? new Date() : null,
            },
          });
          continue;
        }

        if (userQuest.completed) continue;

        const newProgress = userQuest.progress + increment;
        const isCompleted = newProgress >= targetCount;

        await prisma.userQuest.update({
          where: { id: userQuest.id },
          data: {
            progress: newProgress,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });

        console.log(`📊 Progression: ${quest.name} → ${newProgress}/${targetCount}`);

        if (isCompleted && !userQuest.completed) {
          console.log(`🎉 Quête complétée: ${quest.name}`);
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
        include: { quest: true, user: true },
        where: {
          userId_questId: {
            userId: userId,
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

      if (!userQuest.completed) {
        throw new Error('Quête non complétée');
      }

      // Récupérer les récompenses depuis le JSON
      const reward = userQuest.quest.reward as any;
      const coins = reward?.coins || 0;
      const experience = reward?.experience || 0;

      // Donner les coins
      if (coins > 0) {
        await prisma.user.update({
          where: { id: userId },
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

      console.log(`🎁 Récompense réclamée: ${userQuest.quest.name} → ${experience} XP + ${coins} coins`);

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
          type: QuestType.DAILY,
          isActive: true,
        },
      });

      for (const quest of dailyQuests) {
        await prisma.userQuest.updateMany({
          where: { questId: quest.id },
          data: {
            progress: 0,
            completed: false,
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
          type: QuestType.WEEKLY,
          isActive: true,
        },
      });

      for (const quest of weeklyQuests) {
        await prisma.userQuest.updateMany({
          where: { questId: quest.id },
          data: {
            progress: 0,
            completed: false,
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
        include: { quest: true, user: true },
        where: {
          userId: userId,
          quest: { type: QuestType.TUTORIAL },
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