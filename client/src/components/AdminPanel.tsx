import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useStore } from '@/store';
import './AdminPanel.css';

interface FloorType {
  id: string;
  name: string;
  category: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  floor: string;
  wallpaper: string;
  owner: {
    username: string;
  };
}

export const AdminPanel: React.FC = () => {
  const { user } = useStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorTypes, setFloorTypes] = useState<FloorType[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadRooms();
      loadFloorTypes();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    try {
      const response = await api.get('/admin/check');
      setIsAdmin(response.data.isAdmin);
    } catch (error) {
      console.error('Erreur vérification admin:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await api.get('/admin/rooms');
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Erreur chargement salles:', error);
    }
  };

  const loadFloorTypes = async () => {
    try {
      const response = await api.get('/admin/floor-types');
      setFloorTypes(response.data.floorTypes);
    } catch (error) {
      console.error('Erreur chargement types de sol:', error);
    }
  };

  const handleChangeFloor = async () => {
    if (!selectedRoom || !selectedFloor) {
      alert('Sélectionnez une salle et un type de sol');
      return;
    }

    try {
      await api.put(`/admin/room/${selectedRoom}/floor`, {
        floorType: selectedFloor,
      });

      alert('Sol changé avec succès!');
      loadRooms(); // Recharger les salles
      setSelectedRoom(null);
      setSelectedFloor('');
    } catch (error) {
      console.error('Erreur changement sol:', error);
      alert('Erreur lors du changement de sol');
    }
  };

  if (loading) {
    return <div className="admin-panel-loading">Vérification des permissions...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="admin-panel-error">
        <h2>🚫 Accès Refusé</h2>
        <p>Vous n'êtes pas administrateur.</p>
      </div>
    );
  }

  const groupedFloors = floorTypes.reduce((acc, floor) => {
    if (!acc[floor.category]) acc[floor.category] = [];
    acc[floor.category].push(floor);
    return acc;
  }, {} as Record<string, FloorType[]>);

  const categoryNames: Record<string, string> = {
    classic: '🏛️ Classique',
    luxury: '💎 Luxe',
    carpet: '🎨 Tapis',
    outdoor: '🌳 Extérieur',
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-container">
        <div className="admin-header">
          <h1>⚙️ Panel Administrateur</h1>
          <p>Bienvenue, Admin {user?.username}!</p>
        </div>

        <div className="admin-content">
          {/* Liste des salles */}
          <div className="admin-section">
            <h2>🏠 Salles Publiques</h2>
            <div className="rooms-list">
              {rooms.filter(r => r.isPublic).map((room) => (
                <div
                  key={room.id}
                  className={`room-card ${selectedRoom === room.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRoom(room.id);
                    setSelectedFloor(room.floor);
                  }}
                >
                  <div className="room-name">{room.name}</div>
                  <div className="room-info">
                    Sol actuel: <strong>{room.floor}</strong>
                  </div>
                  <div className="room-owner">Par: {room.owner.username}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sélection du sol */}
          {selectedRoom && (
            <div className="admin-section">
              <h2>🎨 Changer le Sol</h2>
              
              {Object.entries(groupedFloors).map(([category, floors]) => (
                <div key={category} className="floor-category">
                  <h3>{categoryNames[category]}</h3>
                  <div className="floor-grid">
                    {floors.map((floor) => (
                      <div
                        key={floor.id}
                        className={`floor-option ${selectedFloor === floor.id ? 'selected' : ''}`}
                        onClick={() => setSelectedFloor(floor.id)}
                      >
                        <div className="floor-preview">
                          <img
                            src={`/assets/habbo-tiles/floor_${floor.id}.png`}
                            alt={floor.name}
                          />
                        </div>
                        <div className="floor-name">{floor.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="admin-actions">
                <button onClick={() => {
                  setSelectedRoom(null);
                  setSelectedFloor('');
                }} className="btn-cancel">
                  Annuler
                </button>
                <button onClick={handleChangeFloor} className="btn-save">
                  💾 Appliquer le Sol
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
