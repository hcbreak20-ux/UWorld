import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPhaserGame } from '@/phaser/config-iso';
import { ChatBox } from '@/components/ChatBox';
import { RoomList } from '@/components/RoomList';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import { authAPI, roomAPI, api } from '@/services/api';
import type { Room } from '@/types';
import './LobbyPage.css';
import { ExperienceBar } from '@/components/ExperienceBar';
import { ChatInput } from '@/components/ChatInput';
import { MessagesPanel } from '@/components/MessagesPanel';
import { Toast } from '@/components/Toast';

// ✅ NOUVEAU: Son de notification
const notificationSound = new Audio('/notification.mp3'); // Vous devrez ajouter ce fichier

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<Phaser.Game | null>(null);
  const { user, token, setUser, currentRoom, setCurrentRoom, logout } = useStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomList, setShowRoomList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);
  
  // ✅ NOUVEAU: États pour notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    username?: string;
  } | null>(null);

  // ✅ NOUVEAU: Charger le compteur de messages non lus
  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/messages/unread/count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Erreur chargement messages non lus:', error);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
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

        // Connecter Socket.IO
        socketService.connect(token);

        // Charger les salles publiques
        const publicRooms = await roomAPI.getPublicRooms();
        setRooms(publicRooms);

        // Auto-join première salle publique ou créer une salle par défaut
        if (publicRooms.length > 0) {
          setCurrentRoom(publicRooms[0]);
        }

        // ✅ NOUVEAU: Charger le compteur de messages non lus
        loadUnreadCount();

        setLoading(false);
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        logout();
        navigate('/login');
      }
    };

    initializeApp();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // ✅ NOUVEAU: Écouter les notifications de messages privés
  useEffect(() => {
    const handlePrivateMessage = (data: {
      messageId: string;
      from: { id: string; username: string; avatar: any };
      content: string;
      createdAt: string;
    }) => {
      console.log('🔔 Notification message privé:', data);
      
      // Incrémenter le compteur
      setUnreadCount(prev => prev + 1);
      
      // Afficher le toast
      setToast({
        message: data.content,
        username: data.from.username
      });
      
      // Jouer le son
      try {
        notificationSound.play().catch(err => {
          console.log('Erreur lecture son:', err);
        });
      } catch (error) {
        console.log('Impossible de jouer le son');
      }
    };

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('private_message_notification', handlePrivateMessage);
    }

    return () => {
      if (socket) {
        socket.off('private_message_notification', handlePrivateMessage);
      }
    };
  }, []);

  // Écouter l'événement d'ouverture des messages
  useEffect(() => {
    const handleOpenMessages = (e: any) => {
      setMessageUserId(e.detail.userId);
      setShowMessages(true);
    };
    
    window.addEventListener('openMessages', handleOpenMessages);
    
    return () => {
      window.removeEventListener('openMessages', handleOpenMessages);
    };
  }, []);

  useEffect(() => {
    if (!loading && currentRoom && !gameRef.current) {
      // Initialiser Phaser
      gameRef.current = createPhaserGame('game-container');
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [loading, currentRoom]);

  const handleJoinRoom = (room: Room) => {
    setCurrentRoom(room);
    setShowRoomList(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ NOUVEAU: Rafraîchir le compteur quand on ouvre la messagerie
  const handleOpenMessages = () => {
    setShowMessages(true);
    // Rafraîchir le compteur après 1 seconde (temps de charger les messages)
    setTimeout(() => {
      loadUnreadCount();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <img src="/uworld-logo.png" alt="UWorld" className="loading-logo" />
        <h2>Chargement...</h2>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <div className="header-left">
          {/* ✅ Logo UWorld */}
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

          {/* ✅ NOUVEAU: Bouton Messages avec badge */}
          <button 
            onClick={handleOpenMessages}
            className="messages-btn"
            style={{ position: 'relative' }}
          >
            💬 Messages
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          
          <button onClick={handleLogout}>🚪 Déconnexion</button>
        </div>
      </div>

      <div className="lobby-content">
        {/* Panneau gauche avec liste des salles */}
        {showRoomList && (
          <div className="left-panel">
            <RoomList rooms={rooms} onJoinRoom={handleJoinRoom} />
          </div>
        )}

        <div className={`game-panel ${!showRoomList ? 'full-width' : ''}`}>
          <div id="game-container"></div>
        </div>

        <div className="right-panel">
          <ChatBox />
        </div>
      </div>

      {/* Inventaire avec bouton Salles */}
      <InventoryPanel 
        showRoomList={showRoomList}
        onToggleRoomList={() => setShowRoomList(!showRoomList)}
      />

      {/* Barre d'expérience */}
      <ExperienceBar />

      {/* Nouvelle barre de chat */}
      <ChatInput />

      {/* Messagerie */}
      {showMessages && (
        <MessagesPanel
          onClose={() => {
            setShowMessages(false);
            setMessageUserId(null);
            loadUnreadCount(); // Rafraîchir le compteur
          }}
          initialUserId={messageUserId}
        />
      )}

      {/* ✅ NOUVEAU: Toast de notification */}
      {toast && (
        <Toast
          message={toast.message}
          username={toast.username}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
