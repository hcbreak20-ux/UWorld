import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { badgeService } from '@/services/badge.service';
import { BadgeGrid } from './BadgeGrid';
import './ProfilePanel.css';

interface ProfilePanelProps {
  onClose: () => void;
  initialTab?: 'profile' | 'achievements'; // Permet d'ouvrir directement sur Achievements
}

interface LevelProgress {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
  totalXp: number;
}

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

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose, initialTab = 'profile' }) => {
  const { user, setUser } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'achievements'>(initialTab);
  const [xpProgress, setXpProgress] = useState<LevelProgress | null>(null);
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [motto, setMotto] = useState(user?.motto || '');
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Charger XP
      const xpResponse = await api.get('/level/progress');
      setXpProgress(xpResponse.data);

      // Charger tous les badges
      const allBadgesData = await badgeService.getAllBadges();
      setAllBadges(allBadgesData);

      // Charger les badges de l'utilisateur
      const userBadgesData = await badgeService.getMyBadges();
      setUserBadges(userBadgesData);
      
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMotto = async () => {
    if (!user) return;

    try {
      const response = await api.put('/users/motto', { motto });
      
      // Mettre à jour le store
      setUser({ ...user, motto });
      setIsEditingMotto(false);
    } catch (error) {
      console.error('Erreur sauvegarde motto:', error);
      alert('Erreur lors de la sauvegarde du motto');
    }
  };

  const handleBadgeSelect = async (badgeId: string) => {
    if (!user) return;

    try {
      // Si on clique sur le badge actif, on le désactive
      const newActiveBadgeId = user.activeBadgeId === badgeId ? null : badgeId;
      
      await api.put('/users/active-badge', { activeBadgeId: newActiveBadgeId });
      
      // Mettre à jour le store
      setUser({ ...user, activeBadgeId: newActiveBadgeId });
    } catch (error) {
      console.error('Erreur changement badge actif:', error);
      alert('Erreur lors du changement de badge');
    }
  };

  if (!user) return null;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel-large" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>👤 Mon Profil</h2>
          <button className="profile-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ✅ NOUVEAU: Onglets */}
        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={`profile-tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            🏆 Achievements ({userBadges.length}/{allBadges.length})
          </button>
        </div>

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'profile' ? (
          <div className="profile-content-large">
            {/* Section gauche: Info personnage */}
            <div className="profile-left-section">
              {/* Avatar */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Nom */}
              <h3 className="profile-username">{user.username}</h3>

              {/* Motto éditable */}
              <div className="profile-motto-section">
                {isEditingMotto ? (
                  <div className="motto-edit">
                    <input
                      type="text"
                      value={motto}
                      onChange={(e) => setMotto(e.target.value)}
                      maxLength={100}
                      placeholder="Ta devise..."
                      autoFocus
                    />
                    <div className="motto-edit-buttons">
                      <button onClick={handleSaveMotto} className="btn-save">✓</button>
                      <button onClick={() => {
                        setIsEditingMotto(false);
                        setMotto(user.motto || '');
                      }} className="btn-cancel">✕</button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="profile-motto"
                    onClick={() => setIsEditingMotto(true)}
                    title="Cliquer pour modifier"
                  >
                    "{user.motto}"
                    <span className="motto-edit-icon">✎</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="profile-stats">
                <div className="profile-stat-row">
                  <span className="stat-label">🏆 Niveau:</span>
                  <span className="stat-value">{xpProgress?.level ?? user.level}</span>
                </div>
                <div className="profile-stat-row">
                  <span className="stat-label">⭐ XP:</span>
                  <span className="stat-value">
                    {xpProgress ? `${xpProgress.currentXp}/${xpProgress.xpForNextLevel}` : user.experience}
                  </span>
                </div>
                <div className="profile-stat-row">
                  <span className="stat-label">📅 Créé le:</span>
                  <span className="stat-value">{formatDate(user.createdAt)}</span>
                </div>
                <div className="profile-stat-row">
                  <span className="stat-label">🕐 Dernier login:</span>
                  <span className="stat-value">{formatTime(user.lastLogin)}</span>
                </div>
              </div>
            </div>

            {/* Section droite: Badge actif */}
            <div className="profile-right-section">
              <div className="profile-badges-header">
                <h3>🏆 Badge Actif</h3>
              </div>

              {loading ? (
                <div className="badges-loading">
                  <div className="loading-spinner">⏳</div>
                  <p>Chargement...</p>
                </div>
              ) : (
                <div className="profile-badges-container">
                  <BadgeGrid
                    allBadges={allBadges}
                    userBadges={userBadges}
                    activeBadgeId={user.activeBadgeId || null}
                    onBadgeSelect={handleBadgeSelect}
                  />
                </div>
              )}

              <div className="badges-hint">
                💡 Clique sur un badge pour l'afficher sur ton profil
              </div>
            </div>
          </div>
        ) : (
          // ✅ ONGLET ACHIEVEMENTS: Tous les badges avec descriptions
          <div className="achievements-content">
            {loading ? (
              <div className="badges-loading">
                <div className="loading-spinner">⏳</div>
                <p>Chargement des achievements...</p>
              </div>
            ) : (
              <AchievementsTab 
                allBadges={allBadges} 
                userBadges={userBadges} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ NOUVEAU COMPOSANT: Onglet Achievements
interface AchievementsTabProps {
  allBadges: Badge[];
  userBadges: UserBadge[];
}

const AchievementsTab: React.FC<AchievementsTabProps> = ({ allBadges, userBadges }) => {
  const unlockedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

  // Grouper par catégorie
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  const categoryNames: Record<string, string> = {
    welcome: '👋 Bienvenue',
    progression: '⭐ Progression',
    social: '💬 Social',
    collection: '🏠 Collection',
    special: '✨ Spéciaux'
  };

  const rarityColors: Record<string, string> = {
    common: '#cccccc',
    rare: '#4a9eff',
    epic: '#a335ee',
    legendary: '#ff8000'
  };

  return (
    <div className="achievements-grid-container">
      {Object.entries(badgesByCategory).map(([category, badges]) => (
        <div key={category} className="achievement-category">
          <h3 className="achievement-category-title">{categoryNames[category] || category}</h3>
          <div className="achievement-list">
            {badges.map((badge) => {
              const isUnlocked = unlockedBadgeIds.has(badge.id);
              
              return (
                <div
                  key={badge.id}
                  className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                  style={{
                    borderColor: isUnlocked ? rarityColors[badge.rarity] : '#333'
                  }}
                >
                  <div className="achievement-icon">
                    {isUnlocked ? badge.icon : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <div className="achievement-name">
                      {isUnlocked ? badge.name : '???'}
                    </div>
                    <div className="achievement-description">
                      {isUnlocked ? badge.description : 'Badge verrouillé - Continue à jouer pour le débloquer!'}
                    </div>
                    {isUnlocked && (
                      <div className="achievement-rarity" style={{ color: rarityColors[badge.rarity] }}>
                        {badge.rarity.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
