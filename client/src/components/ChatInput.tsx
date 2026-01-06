import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import { executeAdminCommand } from '@/utils/adminCommands';
import './ChatInput.css';

type ChatMode = 'normal' | 'shout' | 'whisper';

const EMOJIS = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '💋', '🎮'];

interface ChatInputProps {
  userRole?: string;
}

interface Player {
  userId: string;
  username: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ userRole = 'user' }) => {
  const { setChatInputFocused, user } = useStore();
  const [inputMessage, setInputMessage] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [whisperTarget, setWhisperTarget] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [commandResult, setCommandResult] = useState<string | null>(null);
  
  // ✅ NOUVEAU: State local pour les joueurs dans la salle
  const [roomPlayers, setRoomPlayers] = useState<Player[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ✅ NOUVEAU: Écouter les événements Socket.IO pour les joueurs
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Écouter les mises à jour de joueurs
    const handlePlayersUpdate = (players: any) => {
      console.log('🎮 Joueurs mis à jour:', players);
      
      // Convertir l'objet players en array
      const playersArray: Player[] = Object.entries(players)
        .filter(([userId]) => userId !== user?.id) // Exclure soi-même
        .map(([userId, playerData]: [string, any]) => ({
          userId,
          username: playerData.username || playerData.name || 'Inconnu'
        }));
      
      console.log('👥 Joueurs filtrés pour whisper:', playersArray);
      setRoomPlayers(playersArray);
    };

    // Écouter plusieurs événements possibles
    socket.on('players_update', handlePlayersUpdate);
    socket.on('room_players', handlePlayersUpdate);
    socket.on('player_joined', (data: any) => {
      console.log('👋 Joueur rejoint:', data);
      // Recharger la liste
      socket.emit('get_room_players');
    });
    socket.on('player_left', (data: any) => {
      console.log('👋 Joueur parti:', data);
      // Recharger la liste
      socket.emit('get_room_players');
    });

    // Demander la liste initiale des joueurs
    console.log('🔍 Demande de la liste des joueurs...');
    socket.emit('get_room_players');

    return () => {
      socket.off('players_update', handlePlayersUpdate);
      socket.off('room_players', handlePlayersUpdate);
      socket.off('player_joined');
      socket.off('player_left');
    };
  }, [user?.id]);

  useEffect(() => {
    if (commandResult) {
      const timer = setTimeout(() => {
        setCommandResult(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [commandResult]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    // Vérifier si c'est une commande admin
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
    } else {
      // Recharger la liste des joueurs quand on passe en mode whisper
      const socket = socketService.getSocket();
      if (socket) {
        console.log('🔄 Rechargement des joueurs pour whisper...');
        socket.emit('get_room_players');
      }
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="chat-input-container">
      {/* Affichage du résultat de commande */}
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
            style={{
              backgroundColor: '#1a1a2e',
              color: '#ffffff',
              border: '2px solid #6366f1',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '14px',
            }}
          >
            <option value="" style={{ backgroundColor: '#252541' }}>
              -- Joueur ({roomPlayers.length} en ligne) --
            </option>
            {roomPlayers.length === 0 ? (
              <option value="" disabled style={{ backgroundColor: '#252541' }}>
                Aucun joueur disponible
              </option>
            ) : (
              roomPlayers.map(({ userId, username }) => (
                <option key={userId} value={username} style={{ backgroundColor: '#252541' }}>
                  {username}
                </option>
              ))
            )}
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
