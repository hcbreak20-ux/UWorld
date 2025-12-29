import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { authAPI } from '@/services/api';
import { AvatarMenu } from '@/components/AvatarMenu';
import { ProfilePanel } from '@/components/ProfilePanel';
import './MainMenu.css';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, setUser, logout } = useStore();
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'achievements'>('profile');

  useEffect(() => {
    const initializeUser = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Charger les infos utilisateur si nécessaire
        if (!user) {
          const userData = await authAPI.getMe();
          setUser(userData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        logout();
        navigate('/login');
      }
    };

    initializeUser();
  }, [token, user, setUser, logout, navigate]);

  const handleEnterGame = () => {
    navigate('/lobby');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handlers pour le menu avatar
  const handleOpenProfile = () => {
    setProfileInitialTab('profile');
    setShowProfile(true);
  };

  const handleOpenAchievements = () => {
    setProfileInitialTab('achievements');
    setShowProfile(true);
  };

  if (loading) {
    return (
      <div className="main-menu-loading">
        <img src="/uworld-logo.png" alt="UWorld" className="loading-logo" />
        <h2>Chargement...</h2>
      </div>
    );
  }

  return (
    <div className="main-menu">
      {/* Header */}
      <div className="main-menu-header">
        <div className="header-left">
          <img src="/uworld-logo.png" alt="UWorld" className="header-logo" />
          <h1>UWorld</h1>
        </div>

        <div className="header-actions">
          {/* uCoins */}
          <div className="header-currency">
            <span className="currency-icon">🪙</span>
            <span className="currency-amount">{user?.coins.toLocaleString() || 0}</span>
            <span className="currency-label">uCoins</span>
          </div>
          
          {/* uNuggets */}
          <div className="header-currency">
            <span className="currency-icon">🥇</span>
            <span className="currency-amount">{user?.gems.toLocaleString() || 0}</span>
            <span className="currency-label">uNuggets</span>
          </div>
          
          <button onClick={handleLogout}>🚪 Déconnexion</button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="main-menu-content">
        <div className="main-menu-center">
          {/* Logo principal */}
          <div className="main-menu-logo-container">
            <img src="/uworld-logo.png" alt="UWorld" className="main-menu-logo" />
          </div>

          {/* Titre de bienvenue */}
          <h2 className="main-menu-welcome">
            Bienvenue, {user?.username}!
          </h2>

          {/* Bouton Entrer dans le jeu */}
          <button className="btn-enter-game" onClick={handleEnterGame}>
            🎮 Entrer dans le jeu
          </button>

          {/* Stats rapides */}
          <div className="main-menu-quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-icon">⭐</span>
              <div className="quick-stat-info">
                <span className="quick-stat-label">Niveau</span>
                <span className="quick-stat-value">{user?.level}</span>
              </div>
            </div>
            
            <div className="quick-stat">
              <span className="quick-stat-icon">💬</span>
              <div className="quick-stat-info">
                <span className="quick-stat-label">Amis</span>
                <span className="quick-stat-value">0</span>
              </div>
            </div>
            
            <div className="quick-stat">
              <span className="quick-stat-icon">🏆</span>
              <div className="quick-stat-info">
                <span className="quick-stat-label">Achievements</span>
                <span className="quick-stat-value">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu en bas à gauche */}
      <div className="main-menu-bottom-toolbar">
        <AvatarMenu
          onProfileClick={handleOpenProfile}
          onLooksClick={() => navigate('/avatar')}
          onAchievementsClick={handleOpenAchievements}
          onSettingsClick={() => alert('Settings - À venir!')}
        />
      </div>

      {/* Panneau de Profil */}
      {showProfile && (
        <ProfilePanel 
          onClose={() => setShowProfile(false)} 
          initialTab={profileInitialTab}
        />
      )}
    </div>
  );
};
