import axios from 'axios';
import { UserQuest, QuestStats, QuestReward, GroupedQuests } from '../types/quest.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Récupérer le token du localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const questAPI = {
  /**
   * Récupérer toutes les quêtes de l'utilisateur
   */
  async getQuests(): Promise<{ quests: UserQuest[]; grouped: GroupedQuests }> {
    const response = await axios.get(`${API_URL}/quests`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  /**
   * Récupérer les statistiques de progression
   */
  async getProgress(): Promise<{ stats: QuestStats; quests: UserQuest[] }> {
    const response = await axios.get(`${API_URL}/quests/progress`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  /**
   * Réclamer la récompense d'une quête
   */
  async claimReward(questId: string): Promise<{ reward: QuestReward }> {
    const response = await axios.post(
      `${API_URL}/quests/${questId}/claim`,
      {},
      {
        headers: getAuthHeader(),
      }
    );
    return response.data;
  },

  /**
   * Récupérer les quêtes disponibles (non complétées)
   */
  async getAvailableQuests(): Promise<{ quests: UserQuest[] }> {
    const response = await axios.get(`${API_URL}/quests/available`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  /**
   * Récupérer les quêtes complétées
   */
  async getCompletedQuests(): Promise<{ quests: UserQuest[] }> {
    const response = await axios.get(`${API_URL}/quests/completed`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
