import React from 'react';
import './BanScreen.css';

interface BanScreenProps {
  reason: string;
  duration: string;
  expiresAt: Date | null;
  onClose: () => void;
}

export const BanScreen: React.FC<BanScreenProps> = ({ reason, duration, expiresAt, onClose }) => {
  const formatDuration = (dur: string) => {
    if (dur === 'permanent') return 'Définitif';
    
    const match = dur.match(/^(\d+)([mhdw])$/);
    if (!match) return dur;
    
    const value = match[1];
    const unit = match[2];
    
    const units: Record<string, string> = {
      'm': 'minutes',
      'h': 'heures',
      'd': 'jours',
      'w': 'semaines'
    };
    
    return `${value} ${units[unit] || ''}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleString('fr-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="ban-screen-overlay">
      <div className="ban-screen">
        <div className="ban-icon">🚫</div>
        <h1>VOUS ÊTES BANNI</h1>
        
        <div className="ban-details">
          <div className="ban-detail">
            <span className="label">Durée:</span>
            <span className="value">{formatDuration(duration)}</span>
          </div>
          
          {expiresAt && duration !== 'permanent' && (
            <div className="ban-detail">
              <span className="label">Expire le:</span>
              <span className="value">{formatDate(expiresAt)}</span>
            </div>
          )}
          
          <div className="ban-detail">
            <span className="label">Raison:</span>
            <span className="value reason">{reason || 'Non spécifiée'}</span>
          </div>
        </div>

        <button className="close-ban-btn" onClick={onClose}>
          Fermer et Déconnecter
        </button>

        <p className="ban-footer">
          Vous serez déconnecté en fermant cette fenêtre.
        </p>
      </div>
    </div>
  );
};
