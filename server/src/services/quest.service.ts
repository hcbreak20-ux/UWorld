import { QuestType, ResetTime } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { levelService } from './level.service';

export class QuestService {
  /**
   * Assigner toutes les quêtes tutorial à un nouveau joueur
   */
  async assignTutorialQuests(userId: string) {
    try {
      // Récupérer toutes les quêtes tutorial
      const tutorialQuests = await prisma.quest.findMany({
        where: {
          type: QuestType.TUTORIAL,
          isActive: true,
        },
        orderBy: {
          order: 'asc',
        },
      });

      // Créer les UserQuest pour chaque quête tutorial
      const userQuests = tutorialQuests.map((quest) => ({
        userId,
        questId: quest.id,
        progress: 0,
        completed: false,
      }));

      await prisma.userQuest.createMany({
        data: userQuests,
        skipDuplicates: true,
      });

      console.log(`✅ ${userQuests.length} quêtes tutorial assignées à l'utilisateur ${userId}`);
      return userQuests;
    } catch (error) {
      console.error('Erreur lors de l\'assignation des quêtes tutorial:', error);
      throw error;
    }
  }

  /**
   * Assigner les quêtes daily/weekly à un joueur
   */
  async assignDailyWeeklyQuests(userId: string) {
    try {
      // Récupérer toutes les quêtes daily et weekly actives
      const quests = await prisma.quest.findMany({
        where: {
          type: { in: [QuestType.DAILY, QuestType.WEEKLY] },
          isActive: true,
        },
      });

      // Créer les UserQuest si elles n'existent pas
      for (const quest of quests) {
        await prisma.userQuest.upsert({
          where: {
            userId_questId: {
              userId,
              questId: quest.id,
            },
          },
          update: {},
          create: {
            userId,
            questId: quest.id,
            progress: 0,
            completed: false,
            lastReset: new Date(),
          },
        });
      }

      console.log(`✅ Quêtes daily/weekly assignées à l'utilisateur ${userId}`);
    } catch (error) {
      console.error('Erreur lors de l\'assignation des quêtes daily/weekly:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les quêtes d'un joueur avec leur progression
   */
  async getUserQuests(userId: string) {
    try {
      const userQuests = await prisma.userQuest.findMany({
        where: { userId },
        include: {
          quest: true,
        },
        orderBy: [
          { quest: { type: 'asc' } },
          { quest: { order: 'asc' } },
        ],
      });

      return userQuests;
    } catch (error) {
      console.error('Erreur lors de la récupération des quêtes:', error);
      throw error;
    }
  }

  /**
   * Tracker la progression d'une quête
   */
  async trackProgress(userId: string, targetType: string, increment: number = 1) {
    try {
      // Trouver toutes les quêtes actives correspondant au targetType
      const quests = await prisma.quest.findMany({
        where: {
          targetType,
          isActive: true,
        },
      });

      if (quests.length === 0) return;

      // Mettre à jour la progression pour chaque quête
      for (const quest of quests) {
        const userQuest = await prisma.userQuest.findUnique({
          where: {
            userId_questId: {
              userId,
              questId: quest.id,
            },
          },
        });

        // Si l'utilisateur n'a pas cette quête, la créer
        if (!userQuest) {
          await prisma.userQuest.create({
            data: {
              userId,
              questId: quest.id,
              progress: increment,
              completed: increment >= quest.targetCount,
              completedAt: increment >= quest.targetCount ? new Date() : null,
            },
          });
          continue;
        }

        // Ne pas mettre à jour si déjà complété
        if (userQuest.completed) continue;

        // Incrémenter la progression
        const newProgress = userQuest.progress + increment;
        const isCompleted = newProgress >= quest.targetCount;

        await prisma.userQuest.update({
          where: {
            id: userQuest.id,
          },
          data: {
            progress: newProgress,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });

        console.log(`📊 Progression: ${quest.name} → ${newProgress}/${quest.targetCount}`);

        // Si la quête vient d'être complétée, log
        if (isCompleted && !userQuest.completed) {
          console.log(`🎉 Quête complétée: ${quest.name}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du tracking de progression:', error);
      throw error;
    }
  }

  /**
   * Tracker les modes de chat utilisés (normal, shout, whisper)
   * Pour la quête "Communicateur"
   */
  async trackChatMode(userId: string, chatMode: 'normal' | 'shout' | 'whisper') {
    try {
      const quests = await prisma.quest.findMany({
        where: {
          targetType: 'use_chat_modes',
          isActive: true,
        },
      });

      for (const quest of quests) {
        const userQuest = await prisma.userQuest.findUnique({
          where: {
            userId_questId: { userId, questId: quest.id },
          },
        });

        if (!userQuest || userQuest.completed) continue;

        // Récupérer les modes déjà utilisés
        const metadata = (userQuest.metadata as any) || {};
        const usedModes = new Set<string>(metadata.chatModes || []);
        
        // Ajouter le nouveau mode
        const hadMode = usedModes.has(chatMode);
        usedModes.add(chatMode);

        // Si c'est un nouveau mode, incrémenter la progression
        if (!hadMode) {
          const newProgress = usedModes.size;
          const isCompleted = newProgress >= quest.targetCount;

          await prisma.userQuest.update({
            where: { id: userQuest.id },
            data: {
              progress: newProgress,
              metadata: { chatModes: Array.from(usedModes) },
              completed: isCompleted,
              completedAt: isCompleted ? new Date() : null,
            },
          });

          console.log(`💬 Mode chat ${chatMode} utilisé → ${newProgress}/${quest.targetCount}`);

          if (isCompleted) {
            console.log(`🎉 Quête complétée: ${quest.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Erreur trackChatMode:', error);
    }
  }

  /**
   * Tracker les jours de connexion uniques
   * Pour la quête "Série de Connexions"
   */
  async trackLoginDay(userId: string) {
    try {
      const quests = await prisma.quest.findMany({
        where: {
          targetType: 'login_days',
          isActive: true,
        },
      });

      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

      for (const quest of quests) {
        const userQuest = await prisma.userQuest.findUnique({
          where: {
            userId_questId: { userId, questId: quest.id },
          },
        });

        if (!userQuest || userQuest.completed) continue;

        // Récupérer les jours de connexion
        const metadata = (userQuest.metadata as any) || {};
        const loginDays = new Set<string>(metadata.loginDays || []);
        
        // Ajouter aujourd'hui si pas déjà présent
        const hadToday = loginDays.has(today);
        loginDays.add(today);

        if (!hadToday) {
          const newProgress = loginDays.size;
          const isCompleted = newProgress >= quest.targetCount;

          await prisma.userQuest.update({
            where: { id: userQuest.id },
            data: {
              progress: newProgress,
              metadata: { loginDays: Array.from(loginDays) },
              completed: isCompleted,
              completedAt: isCompleted ? new Date() : null,
            },
          });

          console.log(`📅 Jour de connexion unique #${newProgress}/${quest.targetCount}`);

          if (isCompleted) {
            console.log(`🎉 Quête complétée: ${quest.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Erreur trackLoginDay:', error);
    }
  }

  /**
   * Tracker le temps passé en ligne (en minutes)
   * Pour les quêtes "Temps Passé" et "Marathonien"
   */
  async trackTimeOnline(userId: string, minutes: number = 1) {
    try {
      const quests = await prisma.quest.findMany({
        where: {
          targetType: 'time_online',
          isActive: true,
        },
      });

      for (const quest of quests) {
        const userQuest = await prisma.userQuest.findUnique({
          where: {
            userId_questId: { userId, questId: quest.id },
          },
        });

        if (!userQuest) {
          // Créer la quête si elle n'existe pas
          await prisma.userQuest.create({
            data: {
              userId,
              questId: quest.id,
              progress: minutes,
              completed: minutes >= quest.targetCount,
              completedAt: minutes >= quest.targetCount ? new Date() : null,
            },
          });
          continue;
        }

        if (userQuest.completed) continue;

        // Incrémenter le temps
        const newProgress = userQuest.progress + minutes;
        const isCompleted = newProgress >= quest.targetCount;

        await prisma.userQuest.update({
          where: { id: userQuest.id },
          data: {
            progress: newProgress,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });

        console.log(`⏰ Temps en ligne: ${quest.name} → ${newProgress}/${quest.targetCount} minutes`);

        if (isCompleted) {
          console.log(`🎉 Quête complétée: ${quest.name}`);
        }
      }
    } catch (error) {
      console.error('Erreur trackTimeOnline:', error);
    }
  }

  /**
   * Réclamer la récompense d'une quête
   */
  async claimReward(userId: string, questId: string) {
    try {
      const userQuest = await prisma.userQuest.findUnique({
        where: {
          userId_questId: {
            userId,
            questId,
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

      if (userQuest.rewardClaimed) {
        throw new Error('Récompense déjà réclamée');
      }

      // Donner les coins
      await prisma.user.update({
        where: { id: userId },
        data: {
          coins: { increment: userQuest.quest.coinsReward },
        },
      });

      // Ajouter l'XP avec le système de level
      const levelResult = await levelService.addXp(userId, userQuest.quest.xpReward);

      // Marquer la récompense comme réclamée
      await prisma.userQuest.update({
        where: { id: userQuest.id },
        data: { rewardClaimed: true },
      });

      console.log(`🎁 Récompense réclamée: ${userQuest.quest.name} → ${userQuest.quest.xpReward} XP + ${userQuest.quest.coinsReward} coins`);

      if (levelResult.leveledUp) {
        console.log(`🎊 ${userQuest.user.username} a atteint le niveau ${levelResult.newLevel}!`);
      }

      return {
        xp: userQuest.quest.xpReward,
        coins: userQuest.quest.coinsReward,
        item: userQuest.quest.itemReward,
        badge: userQuest.quest.badgeReward,
        levelUp: levelResult.leveledUp ? {
          oldLevel: levelResult.oldLevel,
          newLevel: levelResult.newLevel,
          currentXp: levelResult.currentXp,
          xpForNextLevel: levelResult.xpForNextLevel,
        } : null,
      };
    } catch (error) {
      console.error('Erreur lors de la réclamation de récompense:', error);
      throw error;
    }
  }

  /**
   * Reset les quêtes daily (à exécuter chaque jour à minuit)
   */
  async resetDailyQuests() {
    try {
      const dailyQuests = await prisma.quest.findMany({
        where: {
          type: QuestType.DAILY,
          resetTime: ResetTime.DAILY,
          isActive: true,
        },
      });

      for (const quest of dailyQuests) {
        await prisma.userQuest.updateMany({
          where: {
            questId: quest.id,
          },
          data: {
            progress: 0,
            completed: false,
            completedAt: null,
            rewardClaimed: false,
            lastReset: new Date(),
          },
        });
      }

      console.log(`🔄 ${dailyQuests.length} quêtes daily reset`);
    } catch (error) {
      console.error('Erreur lors du reset des quêtes daily:', error);
      throw error;
    }
  }

  /**
   * Reset les quêtes weekly (à exécuter chaque lundi)
   */
  async resetWeeklyQuests() {
    try {
      const weeklyQuests = await prisma.quest.findMany({
        where: {
          type: QuestType.WEEKLY,
          resetTime: ResetTime.WEEKLY,
          isActive: true,
        },
      });

      for (const quest of weeklyQuests) {
        await prisma.userQuest.updateMany({
          where: {
            questId: quest.id,
          },
          data: {
            progress: 0,
            completed: false,
            completedAt: null,
            rewardClaimed: false,
            lastReset: new Date(),
          },
        });
      }

      console.log(`🔄 ${weeklyQuests.length} quêtes weekly reset`);
    } catch (error) {
      console.error('Erreur lors du reset des quêtes weekly:', error);
      throw error;
    }
  }

  /**
   * Vérifier et assigner les quêtes manquantes à tous les utilisateurs
   */
  async ensureUserHasQuests(userId: string) {
    try {
      // Assigner tutorial si pas déjà fait
      const tutorialCount = await prisma.userQuest.count({
        where: {
          userId,
          quest: { type: QuestType.TUTORIAL },
        },
      });

      if (tutorialCount === 0) {
        await this.assignTutorialQuests(userId);
      }

      // Assigner daily/weekly
      await this.assignDailyWeeklyQuests(userId);
    } catch (error) {
      console.error('Erreur lors de l\'assignation des quêtes:', error);
    }
  }
}

export const questService = new QuestService();