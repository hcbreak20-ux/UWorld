import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import type { Message } from '@/types';
import './ChatBox.css';

type ChatMode = 'normal' | 'shout' | 'whisper';

export const ChatBox: React.FC = () => {
  const { messages, addMessage, user } = useStore();
  const [isVisible, setIsVisible] = useState(true); // ✅ État pour cacher/afficher
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Écouter les nouveaux messages
    socketService.onChatMessage((message: Message) => {
      console.log('📩 Message reçu dans ChatBox:', message); // ✅ Debug
      addMessage(message);
    });

    return () => {
      // Le cleanup est géré par socketService.onChatMessage()
    };
  }, [addMessage]);

  useEffect(() => {
    // Auto-scroll vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    console.log('💬 Messages dans le store:', messages); // ✅ Debug
  }, [messages]);

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
            
            {messages.map((message, index) => (
              <div
                key={`${message.id}-${index}`}
                className={`chat-message ${message.user.id === user?.id ? 'own-message' : ''} ${message.type || 'normal'}`}
              >
                <div className="message-header">
                  <span className="message-mode-icon">
                    {getChatModeIcon((message as any).type as ChatMode || 'normal')}
                  </span>
                  <span className="message-username" style={{ color: getUserColor(message.user.level) }}>
                    {message.user.username}
                  </span>
                  {(message as any).type === 'whisper' && (message as any).whisperTarget && (
                    <span className="whisper-arrow"> → {(message as any).whisperTarget}</span>
                  )}
                  <span className="message-level">Lvl {message.user.level}</span>
                  <span className="message-time">{formatTime(message.createdAt)}</span>
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
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