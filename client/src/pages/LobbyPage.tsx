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
import { AdminPanel } from '../components/AdminPanel';
import { BanScreen } from '../components/BanScreen';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<Phaser.Game | null>(null);
  const { user, token, setUser, currentRoom, setCurrentRoom, logout } = useStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomList, setShowRoomList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // États pour notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    username?: string;
  } | null>(null);

  // ✅ State pour Warning (AVANT utilisation!)
  const [warningData, setWarningData] = useState<{
    reason: string;
    warningCount: number;
    adminUsername: string;
  } | null>(null);

  // State pour BanScreen
const [isBanned, setIsBanned] = useState(false);
const [banInfo, setBanInfo] = useState<{
  reason: string;
  duration: string;
  expiresAt: Date | null;
} | null>(null);

  // Récupérer le rôle de l'utilisateur
  const userRole = user?.role || 'user';

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      
      audio.play()
        .then(() => console.log('🔊 Son joué'))
        .catch(() => {
          console.log('⚠️ Son bloqué, utilisation du fallback');
          playBeep();
        });
    } catch (err) {
      console.error('❌ Erreur lecture son:', err);
      playBeep();
    }
  };

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔊 Bip généré');
    } catch (err) {
      console.error('❌ Erreur génération son:', err);
    }
  };

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
        if (!user) {
          const userData = await authAPI.getMe();
          setUser(userData);
        }

        socketService.connect(token);

        const publicRooms = await roomAPI.getPublicRooms();
        setRooms(publicRooms);

        if (publicRooms.length > 0) {
          setCurrentRoom(publicRooms[0]);
        }

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

  useEffect(() => {
    const handlePrivateMessage = (data: {
      messageId: string;
      from: { id: string; username: string; avatar: any };
      content: string;
      createdAt: string;
    }) => {
      console.log('📩 Notification message privé:', data);
      
      setUnreadCount(prev => prev + 1);
      
      setToast({
        message: data.content,
        username: data.from.username
      });
      
      playNotificationSound();
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
      gameRef.current = createPhaserGame('game-container');
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [loading, currentRoom]);

  // ✅ NOUVEAU: useEffect pour écouter événements admin Socket.IO
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    
    // Écouter warnings
    socket.on('warning', (data: { 
      reason: string; 
      warningCount: number; 
      adminUsername: string;
    }) => {
      console.log('⚠️ Warning reçu:', data);
      setWarningData(data);
      
      // Son de notification (optionnel)
      try {
        const audio = new Audio('/sounds/warning.mp3');
        audio.play().catch(() => {});
      } catch (err) {
        // Ignore
      }
    });
    
    // Écouter kick
    socket.on('kicked', (data: { reason: string; adminUsername: string }) => {
      alert(`Vous avez été expulsé par ${data.adminUsername}!\nRaison: ${data.reason}`);
      window.location.href = '/login';
    });
    
// Écouter ban
socket.on('banned', (data: { 
  reason: string; 
  duration: string; 
  expiresAt?: string;
  message?: string;
}) => {
  console.log('🚫 Vous avez été banni:', data);
  
  setBanInfo({
    reason: data.reason,
    duration: data.duration || 'permanent',
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
  });
  setIsBanned(true);
});
    
    // Écouter mute
    socket.on('muted', (data: { reason: string; duration?: string }) => {
      alert(`Vous avez été mute!\nRaison: ${data.reason}\nDurée: ${data.duration || 'permanent'}`);
    });
    
    // Écouter unmute
    socket.on('unmuted', () => {
      alert('Vous pouvez à nouveau parler!');
    });
    
    return () => {
      socket.off('warning');
      socket.off('kicked');
      socket.off('banned');
      socket.off('muted');
      socket.off('unmuted');
    };
  }, []);

  // Fonction pour fermer le BanScreen et déconnecter
const handleCloseBan = () => {
  // Déconnecter le socket
  socketService.disconnect();
  
  // Nettoyer le localStorage
  logout();
  
  // Rediriger vers la page de connexion
  window.location.href = '/login';
};

  const handleJoinRoom = (room: Room) => {
    setCurrentRoom(room);
    setShowRoomList(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenMessages = () => {
    setShowMessages(true);
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
    {/* ÉCRAN DE BAN - PRIORITÉ ABSOLUE */}
    {isBanned && banInfo && (
      <BanScreen
        reason={banInfo.reason}
        duration={banInfo.duration}
        expiresAt={banInfo.expiresAt}
        onClose={handleCloseBan}
      />
    )}
      <div className="lobby-header">
        <div className="header-left">
          <img src="/uworld-logo.png" alt="UWorld" className="header-logo" />
          <h1>UWorld</h1>
          
          {/* ✅ Bouton Admin à côté du logo */}
          {(userRole === 'moderator' || userRole === 'admin' || userRole === 'owner') && (
            <button 
              className="admin-button-left"
              onClick={() => setShowAdminPanel(true)}
            >
              👑 Admin
            </button>
          )}
        </div>

        <div className="header-actions">
          <div className="header-currency">
            <span className="currency-icon">🪙</span>
            <span className="currency-amount">{user?.coins.toLocaleString() || 0}</span>
            <span className="currency-label">uCoins</span>
          </div>
          
          <div className="header-currency">
            <span className="currency-icon">🥇</span>
            <span className="currency-amount">{user?.gems.toLocaleString() || 0}</span>
            <span className="currency-label">uNuggets</span>
          </div>

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

      <InventoryPanel 
        showRoomList={showRoomList}
        onToggleRoomList={() => setShowRoomList(!showRoomList)}
      />

      <ExperienceBar />

      {/* ✅ ChatInput avec le rôle passé en props */}
      <ChatInput userRole={userRole} />

      {showMessages && (
        <MessagesPanel
          onClose={() => {
            setShowMessages(false);
            setMessageUserId(null);
            loadUnreadCount();
          }}
          initialUserId={messageUserId}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          username={toast.username}
          onClose={() => setToast(null)}
        />
      )}

      {/* ✅ Panel Admin */}
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)}
          userRole={userRole}
        />
      )}

      {/* ✅ Warning Popup */}
      {warningData && (
        <WarningPopup
          reason={warningData.reason}
          warningCount={warningData.warningCount}
          adminUsername={warningData.adminUsername}
          onClose={() => setWarningData(null)}
        />
      )}
    </div>
  );
};
