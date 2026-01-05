// ================================================
// COMPOSANT POUR AFFICHER LES WARNINGS DE MODÉRATION
// À ajouter dans src/components/moderation/
// ================================================

import React, { useEffect, useState } from 'react';
import { socket } from '../../services/socket';

interface ModerationWarning {
  message: string;
  moderator: string;
  reason: string;
  timestamp: string;
}

const ModerationWarningModal: React.FC = () => {
  const [warning, setWarning] = useState<ModerationWarning | null>(null);

  useEffect(() => {
    // Écouter les warnings
    socket.on('moderation:warning', (data: ModerationWarning) => {
      setWarning(data);
      
      // Auto-fermer après 10 secondes
      setTimeout(() => {
        setWarning(null);
      }, 10000);
    });

    // Écouter les mutes
    socket.on('moderation:muted', (data: { duration: number; reason: string }) => {
      alert(`🔇 Vous avez été rendu muet pour ${data.duration} minutes\nRaison: ${data.reason}`);
    });

    // Écouter les kicks
    socket.on('moderation:kicked', (data: { reason: string; moderator: string }) => {
      alert(`⚠️ Vous avez été expulsé par ${data.moderator}\nRaison: ${data.reason}`);
      // Rediriger vers la page de connexion
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    });

    // Écouter les bans
    socket.on('moderation:banned', (data: { reason: string; permanent: boolean }) => {
      alert(`🚫 Vous avez été banni du serveur\nRaison: ${data.reason}`);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    });

    return () => {
      socket.off('moderation:warning');
      socket.off('moderation:muted');
      socket.off('moderation:kicked');
      socket.off('moderation:banned');
    };
  }, []);

  if (!warning) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#1a1a2e',
        border: '3px solid #ff6b6b',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(255, 107, 107, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          fontSize: '24px',
          color: '#ff6b6b',
          fontWeight: 'bold',
        }}
      >
        <span>⚠️</span>
        <span>AVERTISSEMENT</span>
      </div>

      {/* Message */}
      <div
        style={{
          color: '#ffffff',
          fontSize: '16px',
          marginBottom: '12px',
        }}
      >
        {warning.message}
      </div>

      {/* Raison */}
      <div
        style={{
          backgroundColor: '#252541',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>
          Raison:
        </div>
        <div style={{ color: '#fff', fontSize: '14px' }}>{warning.reason}</div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#888',
        }}
      >
        <span>Modérateur: {warning.moderator}</span>
        <button
          onClick={() => setWarning(null)}
          style={{
            backgroundColor: '#ff6b6b',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
};

export default ModerationWarningModal;
