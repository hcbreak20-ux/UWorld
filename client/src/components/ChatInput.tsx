import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import { executeAdminCommand } from '@/utils/adminCommands'; // ✅ NOUVEAU
import './ChatInput.css';

type ChatMode = 'normal' | 'shout' | 'whisper';

const EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '👋', '🎮'];

// ✅ NOUVEAU: Props avec userRole
interface ChatInputProps {
  userRole?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ userRole = 'user' }) => {
  const { setChatInputFocused, players, user } = useStore();
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [whisperTarget, setWhisperTarget] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [commandResult, setCommandResult] = useState<string | null>(null); // ✅ NOUVEAU
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ✅ NOUVEAU: Masquer le résultat de commande après 5 secondes
  useEffect(() => {
    if (commandResult) {
      const timer = setTimeout(() => {
        setCommandResult(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [commandResult]);

  const otherPlayers = Object.entries(players)
    .filter(([userId]) => userId !== user?.id)
    .map(([userId, player]) => ({ userId, username: player.username }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    // ✅ NOUVEAU: Vérifier si c'est une commande admin
    if (inputMessage.startsWith(':')) {
      const socket = socketService.getSocket();
      
      if (!socket) {
        setCommandResult('❌ Socket non connecté');
        setInputMessage('');
        return;
      }

      try {
        const result = await executeAdminCommand(inputMessage, userRole, socket);
        
        if (result) {
          setCommandResult(result);
          
          // Afficher aussi dans la console pour debug
          console.log('📋 Résultat commande:', result);
        }
      } catch (error) {
        console.error('Erreur commande admin:', error);
        setCommandResult('❌ Erreur lors de l\'exécution de la commande');
      }
      
      setInputMessage('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }

    // Vérifier si whisper nécessite une cible
    if (chatMode === 'whisper' && !whisperTarget) {
      alert('Sélectionne un joueur pour chuchoter!');
      return;
    }

    // Envoyer le message normal
    socketService.sendMessage(inputMessage.trim(), chatMode, whisperTarget);
    setInputMessage('');
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const addEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const getChatModeLabel = (mode: ChatMode) => {
    switch (mode) {
      case 'shout': return '📢 Crier';
      case 'whisper': return '🤫 Chuchoter';
      default: return '💬 Parler';
    }
  };

  const handleModeSelect = (mode: ChatMode) => {
    setChatMode(mode);
    setShowModeDropdown(false);
    if (mode !== 'whisper') {
      setWhisperTarget('');
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="chat-input-container">
      {/* ✅ NOUVEAU: Affichage du résultat de commande */}
      {commandResult && (
        <div className={`command-result ${commandResult.startsWith('✅') ? 'success' : 'error'}`}>
          {commandResult}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        {/* Input principal */}
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onFocus={() => setChatInputFocused(true)}
          onBlur={() => setChatInputFocused(false)}
          placeholder={
            inputMessage.startsWith(':')
              ? 'Commande admin... (ex: :ban user 1h raison)'
              : chatMode === 'whisper' 
              ? `Chuchoter à ${whisperTarget || '...'}` 
              : chatMode === 'shout' 
              ? 'Crier dans toute la salle...' 
              : 'Parler autour de toi...'
          }
          maxLength={500}
          className="chat-input-field"
        />

        {/* Bouton Emoji */}
        <button
          type="button"
          className="chat-emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          😀
        </button>

        {/* Sélecteur de mode */}
        <div className="chat-mode-dropdown">
          <button
            type="button"
            className="chat-mode-btn"
            onClick={() => setShowModeDropdown(!showModeDropdown)}
          >
            {getChatModeLabel(chatMode)} ▼
          </button>

          {showModeDropdown && (
            <div className="chat-mode-menu">
              <button onClick={() => handleModeSelect('normal')}>
                💬 Parler
              </button>
              <button onClick={() => handleModeSelect('shout')}>
                📢 Crier
              </button>
              <button onClick={() => handleModeSelect('whisper')}>
                🤫 Chuchoter
              </button>
            </div>
          )}
        </div>

        {/* Bouton Envoyer */}
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={!inputMessage.trim()}
        >
          Envoyer
        </button>
      </form>

      {/* Sélecteur de cible pour whisper */}
      {chatMode === 'whisper' && (
        <div className="whisper-target-bar">
          <label>À:</label>
          <select 
            value={whisperTarget} 
            onChange={(e) => setWhisperTarget(e.target.value)}
          >
            <option value="">-- Joueur --</option>
            {otherPlayers.map(({ userId, username }) => (
              <option key={userId} value={username}>
                {username}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Picker d'emojis */}
      {showEmojiPicker && (
        <div className="emoji-picker">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-btn"
              onClick={() => addEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};