import { io, Socket } from 'socket.io-client';
import type { Message, Player, PlayerPosition } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connecté au serveur Socket.IO');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Déconnecté du serveur Socket.IO');
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('Erreur Socket.IO:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Rejoindre une salle
  joinRoom(roomId: string, callback: (data: { roomId: string; players: Record<string, Player> }) => void) {
    if (!this.socket) return;
    
    this.socket.emit('join_room', roomId);
    this.socket.once('room_joined', callback);
  }

  // Écouter les événements de joueurs
  onPlayerJoined(callback: (player: Player & { userId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('player_joined', callback);
  }

  onPlayerLeft(callback: (data: { userId: string }) => void) {
    if (!this.socket) return;
    this.socket.on('player_left', callback);
  }

  onPlayerMoved(callback: (data: { userId: string; position: PlayerPosition }) => void) {
    if (!this.socket) return;
    this.socket.on('player_moved', callback);
  }

  // Envoyer un mouvement
  move(position: PlayerPosition) {
    if (!this.socket) return;
    this.socket.emit('move', position);
  }

  // Chat
  sendMessage(message: string, type: string = 'normal', whisperTarget?: string) {
    if (!this.socket) return;
    this.socket.emit('chat_message', { message, type, whisperTarget });
  }

  onChatMessage(callback: (message: Message) => void) {
    if (!this.socket) return;
    // Retirer tous les anciens listeners pour 'chat_message' pour éviter les doublons
    this.socket.off('chat_message');
    this.socket.on('chat_message', callback);
  }

  // Whisper
  sendWhisper(targetUserId: string, message: string) {
    if (!this.socket) return;
    this.socket.emit('whisper', { targetUserId, message });
  }

  onWhisperReceived(callback: (data: { from: { username: string; id: string }; message: string; timestamp: Date }) => void) {
    if (!this.socket) return;
    this.socket.on('whisper_received', callback);
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
