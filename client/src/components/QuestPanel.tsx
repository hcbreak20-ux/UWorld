import { useState, useEffect } from 'react';
import { questAPI } from '../services/quest.service';
import { UserQuest, GroupedQuests, QuestType } from '../types/quest.types';
import { useStore } from '../store';
import './QuestPanel.css';

interface QuestPanelProps {
  onClose: () => void;
  onQuestClaimed?: () => void;
}

type TabType = 'tutorial' | 'daily' | 'weekly' | 'special';

export const QuestPanel: React.FC<QuestPanelProps> = ({ onClose, onQuestClaimed }) => {
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [grouped, setGrouped] = useState<GroupedQuests | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tutorial');
  const [loading, setLoading] = useState(true);
  const { user, updateUser } = useStore();

  // Charger les quêtes
  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      setLoading(true);
      const data = await questAPI.getQuests();
      setQuests(data.quests);
      setGrouped(data.grouped);
    } catch (error) {
      console.error('Erreur lors du chargement des quêtes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Réclamer une récompense
  const handleClaimReward = async (questId: string) => {
    try {
      const response = await questAPI.claimReward(questId);
      
      // Mettre à jour l'utilisateur avec les nouvelles valeurs
      if (user) {
        updateUser({
          experience: user.experience + response.reward.xp,
          coins: user.coins + response.reward.coins,
        });
      }

      // Afficher une notification
      showNotification(
        `Récompense réclamée! +${response.reward.xp} XP, +${response.reward.coins} coins`
      );

      // Recharger les quêtes
      await loadQuests();
      
      // Notifier le parent pour mettre à jour le badge
      if (onQuestClaimed) {
        onQuestClaimed();
      }
    } catch (error: any) {
      console.error('Erreur lors de la réclamation:', error);
      alert(error.response?.data?.message || 'Erreur lors de la réclamation');
    }
  };

  // Afficher une notification
  const showNotification = (message: string) => {
    // Créer une notification toast
    const toast = document.createElement('div');
    toast.className = 'quest-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

  // Obtenir les quêtes de l'onglet actif
  const getActiveQuests = (): UserQuest[] => {
    if (!grouped) return [];
    return grouped[activeTab] || [];
  };

  // Calculer le pourcentage de progression
  const getProgressPercentage = (quest: UserQuest): number => {
    return Math.min(100, (quest.progress / quest.quest.targetCount) * 100);
  };

  // Obtenir le nombre de quêtes complétées par onglet
  const getCompletedCount = (tab: TabType): number => {
    if (!grouped) return 0;
    return grouped[tab]?.filter(q => q.completed).length || 0;
  };

  // Obtenir le nombre total de quêtes par onglet
  const getTotalCount = (tab: TabType): number => {
    if (!grouped) return 0;
    return grouped[tab]?.length || 0;
  };

  // Icônes pour les catégories
  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      social: '💬',
      decoration: '🪑',
      exploration: '🗺️',
      time: '⏰',
    };
    return icons[category] || '⭐';
  };

  if (loading) {
    return (
      <div className="quest-panel-overlay">
        <div className="quest-panel">
          <div className="quest-panel-loading">
            <div className="spinner"></div>
            <p>Chargement des quêtes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-panel-overlay" onClick={onClose}>
      <div className="quest-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="quest-panel-header">
          <h2>📋 Mes Quêtes</h2>
          <button className="quest-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="quest-tabs">
          <button
            className={`quest-tab ${activeTab === 'tutorial' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutorial')}
          >
            🆕 Tutorial
            <span className="quest-tab-count">
              {getCompletedCount('tutorial')}/{getTotalCount('tutorial')}
            </span>
          </button>
          <button
            className={`quest-tab ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            📅 Quotidiennes
            <span className="quest-tab-count">
              {getCompletedCount('daily')}/{getTotalCount('daily')}
            </span>
          </button>
          <button
            className={`quest-tab ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            📆 Hebdomadaires
            <span className="quest-tab-count">
              {getCompletedCount('weekly')}/{getTotalCount('weekly')}
            </span>
          </button>
          <button
            className={`quest-tab ${activeTab === 'special' ? 'active' : ''}`}
            onClick={() => setActiveTab('special')}
          >
            🎉 Spéciales
            <span className="quest-tab-count">
              {getCompletedCount('special')}/{getTotalCount('special')}
            </span>
          </button>
        </div>

        {/* Quest List */}
        <div className="quest-list">
          {getActiveQuests().length === 0 ? (
            <div className="quest-empty">
              <p>Aucune quête disponible dans cette catégorie</p>
            </div>
          ) : (
            getActiveQuests().map((userQuest) => (
              <div
                key={userQuest.id}
                className={`quest-item ${userQuest.completed ? 'completed' : ''}`}
              >
                {/* Quest Header */}
                <div className="quest-item-header">
                  <span className="quest-category-icon">
                    {getCategoryIcon(userQuest.quest.category)}
                  </span>
                  <h3 className="quest-name">{userQuest.quest.name}</h3>
                  {userQuest.completed && (
                    <span className="quest-completed-badge">✅</span>
                  )}
                </div>

                {/* Quest Description */}
                <p className="quest-description">
                  {userQuest.quest.description}
                </p>

                {/* Progress Bar */}
                {!userQuest.completed && (
                  <div className="quest-progress">
                    <div className="quest-progress-bar">
                      <div
                        className="quest-progress-fill"
                        style={{ width: `${getProgressPercentage(userQuest)}%` }}
                      ></div>
                    </div>
                    <span className="quest-progress-text">
                      {userQuest.progress}/{userQuest.quest.targetCount}
                    </span>
                  </div>
                )}

                {/* Rewards */}
                <div className="quest-rewards">
                  <span className="quest-reward">
                    ⭐ {userQuest.quest.xpReward} XP
                  </span>
                  <span className="quest-reward">
                    💰 {userQuest.quest.coinsReward} coins
                  </span>
                  {userQuest.quest.itemReward && (
                    <span className="quest-reward">🎁 Item</span>
                  )}
                  {userQuest.quest.badgeReward && (
                    <span className="quest-reward">🏆 Badge</span>
                  )}
                </div>

                {/* Claim Button */}
                {userQuest.completed && !userQuest.rewardClaimed && (
                  <button
                    className="quest-claim-btn"
                    onClick={() => handleClaimReward(userQuest.questId)}
                  >
                    🎁 Réclamer la récompense
                  </button>
                )}

                {userQuest.completed && userQuest.rewardClaimed && (
                  <div className="quest-claimed">Récompense réclamée ✓</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
