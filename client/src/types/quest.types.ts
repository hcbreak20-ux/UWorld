// Types pour le système de quêtes

export type QuestType = 'TUTORIAL' | 'DAILY' | 'WEEKLY' | 'SPECIAL' | 'HIDDEN';

export type QuestCategory = 'social' | 'decoration' | 'exploration' | 'time';

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  category: QuestCategory;
  targetType: string;
  targetCount: number;
  xpReward: number;
  coinsReward: number;
  itemReward?: string;
  badgeReward?: string;
  order?: number;
  isActive: boolean;
}

export interface UserQuest {
  id: string;
  userId: string;
  questId: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
  rewardClaimed: boolean;
  quest: Quest;
}

export interface QuestStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  rewardsToClaim: number;
}

export interface QuestReward {
  xp: number;
  coins: number;
  item?: string;
  badge?: string;
}

export interface GroupedQuests {
  tutorial: UserQuest[];
  daily: UserQuest[];
  weekly: UserQuest[];
  special: UserQuest[];
  hidden: UserQuest[];
}
