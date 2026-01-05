import { api } from './api';

export interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  totalRooms: number;
  totalBadges: number;
  bannedUsers: number;
  mutedUsers: number;
}

export interface AdminLog {
  id: string;
  adminId: string;
  targetUserId: string;
  action: string;
  reason: string;
  details: any;
  createdAt: string;
  admin: {
    username: string;
  };
  targetUser: {
    username: string;
  };
}

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  isAdminOnly: boolean;
}

export const adminService = {
  /**
   * BAN un utilisateur
   */
  async banUser(username: string, duration: string, reason: string) {
    const response = await api.post('/admin/ban', {
      username,
      duration,
      reason
    });
    return response.data;
  },

  /**
   * MUTE un utilisateur
   */
  async muteUser(username: string, duration: string, reason: string) {
    const response = await api.post('/admin/mute', {
      username,
      duration,
      reason
    });
    return response.data;
  },

  /**
   * WARN un utilisateur
   */
  async warnUser(username: string, reason: string) {
    const response = await api.post('/admin/warn', {
      username,
      reason
    });
    return response.data;
  },

  /**
   * KICK un utilisateur
   */
  async kickUser(username: string, reason: string) {
    const response = await api.post('/admin/kick', {
      username,
      reason
    });
    return response.data;
  },

  /**
   * UNBAN un utilisateur
   */
  async unbanUser(username: string) {
    const response = await api.post('/admin/unban', {
      username
    });
    return response.data;
  },

  /**
   * UNMUTE un utilisateur
   */
  async unmuteUser(username: string) {
    const response = await api.post('/admin/unmute', {
      username
    });
    return response.data;
  },

  /**
   * DONNER un badge
   */
  async giveBadge(username: string, badgeKey: string) {
    const response = await api.post('/admin/give-badge', {
      username,
      badgeKey
    });
    return response.data;
  },

  /**
   * RETIRER un badge
   */
  async removeBadge(username: string, badgeKey: string) {
    const response = await api.post('/admin/remove-badge', {
      username,
      badgeKey
    });
    return response.data;
  },

  /**
   * DONNER des coins
   */
  async giveCoins(username: string, amount: number) {
    const response = await api.post('/admin/give-coins', {
      username,
      amount
    });
    return response.data;
  },

  /**
   * DONNER des gems
   */
  async giveGems(username: string, amount: number) {
    const response = await api.post('/admin/give-gems', {
      username,
      amount
    });
    return response.data;
  },

  /**
   * RÉCUPÉRER les statistiques
   */
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  /**
   * RÉCUPÉRER les logs
   */
  async getLogs(limit: number = 50): Promise<AdminLog[]> {
    const response = await api.get(`/admin/logs?limit=${limit}`);
    return response.data.logs;
  },

  /**
   * RÉCUPÉRER tous les badges
   */
  async getBadges(): Promise<Badge[]> {
    const response = await api.get('/badges');
    return response.data;
  }
};
