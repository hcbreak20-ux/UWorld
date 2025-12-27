import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import './ProfilePanel.css';

interface ProfilePanelProps {
  onClose: () => void;
}

interface LevelProgress {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
  totalXp: number;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose }) => {
  const { user } = useStore();
  const [xpProgress, setXpProgress] = useState<LevelProgress | null>(null);

  useEffect(() => {
    const fetchXpProgress = async () => {
      try {
        const response = await api.get('/level/progress');
        setXpProgress(response.data);
      } catch (error) {
        console.error('Erreur chargement XP:', error);
      }
    };

    fetchXpProgress();
  }, []);

  if (!user) return null;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>👤 Mon Profil</h2>
          <button className="profile-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="profile-content">
          {/* Avatar */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h3>{user.username}</h3>
            <p className="profile-motto">"{user.motto}"</p>
          </div>

          {/* Stats */}
          <div className="profile-stats-grid">
            <div className="profile-stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-info">
                <span className="stat-label">Niveau</span>
                <span className="stat-value">{user.level}</span>
              </div>
            </div>

            <div className="profile-stat-card">
              <div className="stat-icon">🪙</div>
              <div className="stat-info">
                <span className="stat-label">uCoins</span>
                <span className="stat-value">{user.coins.toLocaleString()}</span>
              </div>
            </div>

            <div className="profile-stat-card">
              <div className="stat-icon">🥇</div>
              <div className="stat-info">
                <span className="stat-label">uNuggets</span>
                <span className="stat-value">{user.gems.toLocaleString()}</span>
              </div>
            </div>

            <div className="profile-stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <span className="stat-label">XP</span>
                <span className="stat-value">
                  {xpProgress ? `${xpProgress.currentXp}/${xpProgress.xpForNextLevel}` : `${user.experience}`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <Link to="/avatar" className="profile-btn primary" onClick={onClose}>
              🎨 Personnaliser Avatar
            </Link>
            
            {user.isAdmin && (
              <Link to="/admin" className="profile-btn admin" onClick={onClose}>
                ⚙️ Panel Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};