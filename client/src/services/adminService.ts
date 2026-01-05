import { api } from './api';

export interface AdminStats {
  totalUsers: number;
  bannedUsers: number;
  mutedUsers: number;
  totalBadges: number;
  totalLogs: number;
  totalRooms: number;
  publicRooms: number;
}

export interface AdminLog {
  id: string;
  adminId: string;
  targetUserId: string;
  action: string;
  reason?: string;
  details: any;
  createdAt: string;
  admin: {
    username: string;
    role: string;
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
      targetUsername: username,
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
      targetUsername: username,
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
      targetUsername: username,
      reason
    });
    return response.data;
  },

  /**
   * KICK un utilisateur (via Socket.IO normalement)
   */
  async kickUser(username: string, reason: string) {
    // Note: Le kick se fait normalement via Socket.IO
    // Mais on peut créer une route REST si nécessaire
    throw new Error('Le kick se fait via les commandes chat: :kick username raison');
  },

  /**
   * UNBAN un utilisateur
   */
  async unbanUser(username: string) {
    const response = await api.post('/admin/unban', {
      targetUsername: username
    });
    return response.data;
  },

  /**
   * UNMUTE un utilisateur
   */
  async unmuteUser(username: string) {
    const response = await api.post('/admin/unmute', {
      targetUsername: username
    });
    return response.data;
  },

  /**
   * DONNER un badge
   * Route: /admin/badge/give
   */
  async giveBadge(username: string, badgeKey: string) {
    const response = await api.post('/admin/badge/give', {
      targetUsername: username,
      badgeCode: badgeKey
    });
    return response.data;
  },

  /**
   * RETIRER un badge
   * Route: /admin/badge/remove
   */
  async removeBadge(username: string, badgeKey: string) {
    const response = await api.post('/admin/badge/remove', {
      targetUsername: username,
      badgeCode: badgeKey
    });
    return response.data;
  },

  /**
   * DONNER des coins
   * Route: /admin/coins/give
   */
  async giveCoins(username: string, amount: number) {
    const response = await api.post('/admin/coins/give', {
      targetUsername: username,
      amount
    });
    return response.data;
  },

  /**
   * DONNER des gems (uNuggets)
   * Route: /admin/nuggets/give
   */
  async giveGems(username: string, amount: number) {
    const response = await api.post('/admin/nuggets/give', {
      targetUsername: username,
      amount
    });
    return response.data;
  },

  /**
   * RÉCUPÉRER les statistiques
   * Route: /admin/stats
   * Retourne directement l'objet stats
   */
  async getStats(): Promise<AdminStats> {
    const response = await api.get('/admin/stats');
    return response.data; // Pas response.data.stats
  },

  /**
   * RÉCUPÉRER les logs
   * Route: /admin/logs
   * Retourne directement l'array
   */
  async getLogs(limit: number = 50): Promise<AdminLog[]> {
    const response = await api.get(`/admin/logs?limit=${limit}`);
    return response.data; // Pas response.data.logs
  },

  /**
   * RÉCUPÉRER tous les badges
   */
  async getBadges(): Promise<Badge[]> {
    const response = await api.get('/badges');
    return response.data;
  },

  /**
   * SUPPRIMER un log
   */
  async deleteLog(logId: string) {
    const response = await api.delete(`/admin/logs/${logId}`);
    return response.data;
  },

  /**
   * SUPPRIMER plusieurs logs
   */
  async deleteLogs(logIds: string[]) {
    const response = await api.post('/admin/logs/delete-many', { logIds });
    return response.data;
  },

  /**
   * OBTENIR la liste des utilisateurs
   */
  async getUsers() {
    const response = await api.get('/admin/users');
    return response.data;
  },

  /**
   * OBTENIR les utilisateurs bannis
   */
  async getBannedUsers() {
    const response = await api.get('/admin/users/banned');
    return response.data;
  },

  /**
   * OBTENIR les utilisateurs mutes
   */
  async getMutedUsers() {
    const response = await api.get('/admin/users/muted');
    return response.data;
  },

  /**
   * OBTENIR les salles
   */
  async getRooms() {
    const response = await api.get('/admin/rooms');
    return response.data;
  }
};
