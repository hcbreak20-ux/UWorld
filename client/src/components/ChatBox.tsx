import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import type { Message } from '@/types';
import './ChatBox.css';

type ChatMode = 'normal' | 'shout' | 'whisper';

export const ChatBox: React.FC = () => {
  const { messages, addMessage, user, players, setChatInputFocused } = useStore();
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [whisperTarget, setWhisperTarget] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Écouter les nouveaux messages
    socketService.onChatMessage((message: Message) => {
      addMessage(message);
    });

    // Cleanup: pas nécessaire car onChatMessage fait déjà off() avant on()
    // Mais on peut quand même retourner une fonction de nettoyage
    return () => {
      // Le cleanup est géré par socketService.onChatMessage()
    };
  }, [addMessage]);

  useEffect(() => {
    // Auto-scroll vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    // Vérifier si whisper nécessite une cible
    if (chatMode === 'whisper' && !whisperTarget) {
      alert('Sélectionne un joueur pour chuchoter!');
      return;
    }

    // Envoyer le message avec le type
    socketService.sendMessage(inputMessage.trim(), chatMode, whisperTarget);
    setInputMessage('');
  };

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

  // Récupérer la liste des joueurs pour le whisper
  const otherPlayers = Object.entries(players)
    .filter(([userId]) => userId !== user?.id)
    .map(([userId, player]) => ({ userId, username: player.username }));

  return (
    <div className="chat-box">
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

      {/* Sélecteur de mode de chat */}
      <div className="chat-mode-selector">
        <button
          className={`mode-btn ${chatMode === 'normal' ? 'active' : ''}`}
          onClick={() => setChatMode('normal')}
          title="Parler (distance proche)"
        >
          💬 Parler
        </button>
        <button
          className={`mode-btn ${chatMode === 'shout' ? 'active' : ''}`}
          onClick={() => setChatMode('shout')}
          title="Crier (toute la salle)"
        >
          📢 Crier
        </button>
        <button
          className={`mode-btn ${chatMode === 'whisper' ? 'active' : ''}`}
          onClick={() => setChatMode('whisper')}
          title="Chuchoter (privé)"
        >
          🤫 Chuchoter
        </button>
      </div>

      {/* Sélecteur de cible pour whisper */}
      {chatMode === 'whisper' && (
        <div className="whisper-target-selector">
          <label>Chuchoter à:</label>
          <select 
            value={whisperTarget} 
            onChange={(e) => setWhisperTarget(e.target.value)}
          >
            <option value="">-- Sélectionne un joueur --</option>
            {otherPlayers.map(({ userId, username }) => (
              <option key={userId} value={username}>
                {username}
              </option>
            ))}
          </select>
        </div>
      )}

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onFocus={() => setChatInputFocused(true)}
          onBlur={() => setChatInputFocused(false)}
          placeholder={
            chatMode === 'whisper' 
              ? 'Message privé...' 
              : chatMode === 'shout' 
              ? 'Crier dans toute la salle...' 
              : 'Parler autour de toi...'
          }
          maxLength={500}
        />
        <button type="submit" disabled={!inputMessage.trim()}>
          {getChatModeIcon(chatMode)} Envoyer
        </button>
      </form>
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
