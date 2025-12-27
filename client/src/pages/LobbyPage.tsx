import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPhaserGame } from '@/phaser/config-iso';
import { ChatBox } from '@/components/ChatBox';
import { RoomList } from '@/components/RoomList';
import { UserInfo } from '@/components/UserInfo';
import { InventoryPanel } from '@/components/InventoryPanel';
import { useStore } from '@/store';
import { socketService } from '@/services/socket';
import { authAPI, roomAPI } from '@/services/api';
import type { Room } from '@/types';
import './LobbyPage.css';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const gameRef = useRef<Phaser.Game | null>(null);
  const { user, token, setUser, currentRoom, setCurrentRoom, logout } = useStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomList, setShowRoomList] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <h2>Chargement...</h2>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h1>🏨 Virtual World</h1>
        <div className="header-actions">
          <button onClick={() => setShowRoomList(!showRoomList)}>
            📋 Salles
          </button>
          <button onClick={handleLogout}>🚪 Déconnexion</button>
        </div>
      </div>

      <div className="lobby-content">
        <div className="left-panel">
          <UserInfo />
          {showRoomList && (
            <RoomList rooms={rooms} onJoinRoom={handleJoinRoom} />
          )}
        </div>

        <div className="game-panel">
          <div id="game-container"></div>
        </div>

        <div className="right-panel">
          <ChatBox />
        </div>
      </div>

      {/* Inventaire style Habbo */}
      <InventoryPanel />
    </div>
  );
};
