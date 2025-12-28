import { api } from './api';

interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
}

interface UserBadge {
  id: string;
  badgeId: string;
  unlockedAt: string;
  badge: Badge;
}

export const badgeService = {
  /**
   * Récupérer tous les badges disponibles
   */
  async getAllBadges(): Promise<Badge[]> {
    const response = await api.get('/badges');
    return response.data;
  },

  /**
   * Récupérer les badges de l'utilisateur connecté
   */
  async getMyBadges(): Promise<UserBadge[]> {
    const response = await api.get('/badges/my');
    return response.data;
  },

  /**
   * Récupérer les badges d'un utilisateur spécifique
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    const response = await api.get(`/badges/user/${userId}`);
    return response.data;
  },

  /**
   * Débloquer un badge (usage interne)
   */
  async unlockBadge(badgeKey: string): Promise<any> {
    const response = await api.post('/badges/unlock', { badgeKey });
    return response.data;
  },

  /**
   * Récupérer les statistiques des badges
   */
  async getBadgeStats(): Promise<any> {
    const response = await api.get('/badges/stats');
    return response.data;
  }
};
