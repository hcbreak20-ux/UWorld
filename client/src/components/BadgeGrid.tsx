import React from 'react';
import './BadgeGrid.css';

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

interface BadgeGridProps {
  allBadges: Badge[];
  userBadges: UserBadge[];
  activeBadgeId: string | null;
  onBadgeSelect: (badgeId: string) => void;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({
  allBadges,
  userBadges,
  activeBadgeId,
  onBadgeSelect
}) => {
  // Map des badges débloqués par ID
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
    <div className="badge-grid-container">
      {Object.entries(badgesByCategory).map(([category, badges]) => (
        <div key={category} className="badge-category">
          <h4 className="badge-category-title">{categoryNames[category] || category}</h4>
          <div className="badge-grid">
            {badges.map((badge) => {
              const isUnlocked = unlockedBadgeIds.has(badge.id);
              const isActive = activeBadgeId === badge.id;
              
              return (
                <div
                  key={badge.id}
                  className={`badge-item ${isUnlocked ? 'unlocked' : 'locked'} ${isActive ? 'active' : ''}`}
                  onClick={() => isUnlocked && onBadgeSelect(badge.id)}
                  title={isUnlocked ? badge.description : '???'}
                  style={{
                    borderColor: isUnlocked ? rarityColors[badge.rarity] : '#333'
                  }}
                >
                  <div className="badge-icon">
                    {isUnlocked ? badge.icon : '🔒'}
                  </div>
                  {isUnlocked && (
                    <>
                      <div className="badge-name">{badge.name}</div>
                      {isActive && (
                        <div className="badge-active-indicator">
                          ✓ Actif
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {userBadges.length === 0 && (
        <div className="no-badges">
          <div className="no-badges-icon">🏆</div>
          <p>Aucun badge débloqué</p>
          <small>Complète des quêtes et explore le monde!</small>
        </div>
      )}
    </div>
  );
};
