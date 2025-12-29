import React, { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import { api } from '@/services/api';
import type { Message } from '@/types';
import './ChatBox.css';

type ChatMode = 'normal' | 'shout' | 'whisper';

interface UserLevel {
  userId: string;
  level: number;
  lastFetched: number;
}

export const ChatBox: React.FC = () => {
  const { messages, addMessage, user } = useStore();
  const [isVisible, setIsVisible] = useState(true);
  const [userLevels, setUserLevels] = useState<Map<string, UserLevel>>(new Map());

  // ✅ Fonction pour charger le niveau d'un utilisateur
  const fetchUserLevel = async (userId: string) => {
    try {
      // Vérifier si on a déjà le niveau en cache (moins de 60 secondes)
      const cached = userLevels.get(userId);
      const now = Date.now();
      if (cached && (now - cached.lastFetched) < 60000) {
        return cached.level;
      }

      // Charger depuis l'API
      const response = await api.get(`/users/profile/${userId}`);
      const level = response.data.level;

      // Mettre en cache
      setUserLevels(prev => new Map(prev).set(userId, {
        userId,
        level,
        lastFetched: now
      }));

      return level;
    } catch (error) {
      console.error('Erreur chargement niveau:', error);
      return null;
    }
  };

  // ✅ Charger le niveau du user actuel
  useEffect(() => {
    if (user) {
      const loadMyLevel = async () => {
        try {
          const response = await api.get('/level/progress');
          setUserLevels(prev => new Map(prev).set(user.id, {
            userId: user.id,
            level: response.data.level,
            lastFetched: Date.now()
          }));
        } catch (error) {
          console.error('Erreur chargement mon niveau:', error);
        }
      };
      loadMyLevel();

      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(loadMyLevel, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // ✅ Charger les niveaux des utilisateurs dans les messages
  useEffect(() => {
    const loadLevels = async () => {
      const uniqueUserIds = [...new Set(messages.map(m => m.user.id))];
      
      for (const userId of uniqueUserIds) {
        // Ne charger que si pas déjà en cache
        if (!userLevels.has(userId)) {
          await fetchUserLevel(userId);
        }
      }
    };

    if (messages.length > 0) {
      loadLevels();
    }
  }, [messages]);

  useEffect(() => {
    // Écouter les nouveaux messages
    const cleanup = socketService.onChatMessage((message: Message) => {
      console.log('📩 Message reçu dans ChatBox:', message);
      addMessage(message);
      
      // Charger le niveau de l'utilisateur du nouveau message
      fetchUserLevel(message.user.id);
    });

    return cleanup;
  }, [addMessage]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getChatModeIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'shout': return '📢';
      case 'whisper': return '🤫';
      default: return '💬';
    }
  };

  // ✅ Obtenir le niveau réel ou fallback sur message.user.level
  const getUserLevel = (message: Message): number => {
    const cachedLevel = userLevels.get(message.user.id);
    return cachedLevel?.level ?? message.user.level;
  };

  return (
    <div className={`chat-box ${!isVisible ? 'chat-hidden' : ''}`}>
      {/* Bouton toggle */}
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsVisible(!isVisible)}
        title={isVisible ? 'Cacher le chat' : 'Afficher le chat'}
      >
        {isVisible ? '▶' : '◀'}
      </button>

      {isVisible && (
        <>
          <div className="chat-header">
            <h3>💬 Chat</h3>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Aucun message. Soyez le premier à parler!</p>
              </div>
            )}
            
            {/* ✅ CORRIGÉ: Afficher tous les messages (le store limite déjà à 10) */}
            {messages.map((message, index) => {
              const userLevel = getUserLevel(message);
              
              return (
                <div
                  key={`${message.id}-${index}`}
                  className={`chat-message ${message.user.id === user?.id ? 'own-message' : ''} ${message.type || 'normal'}`}
                >
                  <div className="message-header">
                    <span className="message-mode-icon">
                      {getChatModeIcon((message as any).type as ChatMode || 'normal')}
                    </span>
                    <span className="message-username" style={{ color: getUserColor(userLevel) }}>
                      {message.user.username}
                    </span>
                    {(message as any).type === 'whisper' && (message as any).whisperTarget && (
                      <span className="whisper-arrow"> → {(message as any).whisperTarget}</span>
                    )}
                    <span className="message-level">Lvl {userLevel}</span>
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Couleur basée sur le niveau
const getUserColor = (level: number): string => {
  if (level >= 50) return '#FFD700'; // Or
  if (level >= 25) return '#C0C0C0'; // Argent
  if (level >= 10) return '#CD7F32'; // Bronze
  return '#FFFFFF'; // Blanc
};
