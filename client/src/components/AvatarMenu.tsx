import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import './AvatarMenu.css';

interface AvatarMenuProps {
  onProfileClick: () => void;
  onLooksClick: () => void;
  onAchievementsClick: () => void;
  onSettingsClick: () => void;
}

export const AvatarMenu: React.FC<AvatarMenuProps> = ({
  onProfileClick,
  onLooksClick,
  onAchievementsClick,
  onSettingsClick
}) => {
  const { user } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          <span className="avatar-menu-level">Niveau {user.level}</span>
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
