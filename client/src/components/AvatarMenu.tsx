import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/services/api';
import './AvatarMenu.css';

interface AvatarMenuProps {
  onProfileClick: () => void;
  onLooksClick: () => void;
  onAchievementsClick: () => void;
  onSettingsClick: () => void;
}

interface LevelProgress {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
  totalXp: number;
}

export const AvatarMenu: React.FC<AvatarMenuProps> = ({
  onProfileClick,
  onLooksClick,
  onAchievementsClick,
  onSettingsClick
}) => {
  const { user } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ✅ Charger le vrai niveau depuis l'API
  useEffect(() => {
    const fetchLevel = async () => {
      try {
        const response = await api.get('/level/progress');
        setLevelProgress(response.data);
      } catch (error) {
        console.error('Erreur chargement niveau:', error);
      }
    };

    fetchLevel();
    
    // Rafraîchir toutes les 30 secondes (synchronisé avec ExperienceBar)
    const interval = setInterval(fetchLevel, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!user) return null;

  const handleMenuItemClick = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  // ✅ Utiliser le vrai niveau de l'API ou fallback sur user.level
  const displayLevel = levelProgress?.level ?? user.level;

  return (
    <div className="avatar-menu-container" ref={menuRef}>
      {/* Avatar cliquable */}
      <div 
        className="avatar-menu-button"
        onClick={() => setShowMenu(!showMenu)}
        title={user.username}
      >
        <div className="avatar-menu-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="avatar-menu-info">
          <span className="avatar-menu-username">{user.username}</span>
          <span className="avatar-menu-level">Niveau {displayLevel}</span>
        </div>
      </div>

      {/* Menu contextuel */}
      {showMenu && (
        <div className="avatar-context-menu">
          <button 
            className="avatar-menu-item"
            onClick={() => handleMenuItemClick(onProfileClick)}
          >
            <span className="menu-item-icon">👤</span>
            <span className="menu-item-text">Profile</span>
          </button>

          <button 
            className="avatar-menu-item"
            onClick={() => handleMenuItemClick(onLooksClick)}
          >
            <span className="menu-item-icon">🎨</span>
            <span className="menu-item-text">Looks</span>
          </button>

          <button 
            className="avatar-menu-item"
            onClick={() => handleMenuItemClick(onAchievementsClick)}
          >
            <span className="menu-item-icon">🏆</span>
            <span className="menu-item-text">Achievements</span>
          </button>

          <div className="menu-divider"></div>

          <button 
            className="avatar-menu-item"
            onClick={() => handleMenuItemClick(onSettingsClick)}
          >
            <span className="menu-item-icon">⚙️</span>
            <span className="menu-item-text">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};
