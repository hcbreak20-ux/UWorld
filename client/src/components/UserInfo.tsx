import React from 'react';
import { useStore } from '@/store';
import './UserInfo.css';
import { Link } from 'react-router-dom';

export const UserInfo: React.FC = () => {
  const { user } = useStore();
  
  if (!user) return null;

  return (
    <div className="user-info">
      <div className="user-avatar">
        <div className="avatar-placeholder">
          {user.username.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <div className="user-details">
        <h2>{user.username}</h2>
        <p className="user-motto">"{user.motto}"</p>
        
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-label">Niveau</span>
            <span className="stat-value">{user.level}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">💰 Pièces</span>
            <span className="stat-value gold">{user.coins.toLocaleString()}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">💎 Gemmes</span>
            <span className="stat-value gems">{user.gems.toLocaleString()}</span>
          </div>
        </div>
        
        <Link to="/avatar" className="btn-customize">
          🎨 Personnaliser Avatar
        </Link>
        
        {user?.isAdmin && (
          <Link to="/admin" className="btn-admin">
            ⚙️ Panel Admin
          </Link>
        )}
      </div>
    </div>
  );
};
