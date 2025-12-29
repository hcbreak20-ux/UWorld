import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPhaserGame } from '@/phaser/config-iso';
import { ChatBox } from '@/components/ChatBox';
import { RoomList } from '@/components/RoomList';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import { authAPI, roomAPI } from '@/services/api';
import type { Room } from '@/types';
import './LobbyPage.css';
import { ExperienceBar } from '@/components/ExperienceBar';
import { ChatInput } from '@/components/ChatInput';
import { MessagesPanel } from '@/components/MessagesPanel';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<Phaser.Game | null>(null);
  const { user, token, setUser, currentRoom, setCurrentRoom, logout } = useStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomList, setShowRoomList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMessages, setShowMessages] = useState(false);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);

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

  // ✅✅ AJOUTER CE USEEFFECT ICI:
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

                <button onClick={() => setShowMessages(true)}>
                💬 Messages
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

      {showMessages && (
  <MessagesPanel
    onClose={() => {
      setShowMessages(false);
      setMessageUserId(null);
    }}
    initialUserId={messageUserId}
  />
)}

    </div>
  );
};
