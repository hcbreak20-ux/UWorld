import React from 'react';
import type { Room } from '@/types';
import './RoomList.css';

interface RoomListProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
}

export const RoomList: React.FC<RoomListProps> = ({ rooms, onJoinRoom }) => {
  return (
    <div className="room-list">
      <h3>📋 Salles publiques</h3>
      
      {rooms.length === 0 && (
        <p className="no-rooms">Aucune salle disponible</p>
      )}
      
      <div className="rooms-container">
        {rooms.map((room) => (
          <div key={room.id} className="room-card">
            <div className="room-header">
              <h4>{room.name}</h4>
              <span className="room-visibility">
                {room.isPublic ? '🌍 Public' : '🔒 Privé'}
              </span>
            </div>
            
            {room.description && (
              <p className="room-description">{room.description}</p>
            )}
            
            <div className="room-footer">
              <span className="room-owner">
                Par {room.owner.username}
              </span>
              <button 
                className="btn-join"
                onClick={() => onJoinRoom(room)}
              >
                Rejoindre
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
