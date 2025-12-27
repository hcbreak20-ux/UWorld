import { io, Socket } from 'socket.io-client';
import type { Message, Player, PlayerPosition } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private chatListeners: Set<(message: Message) => void> = new Set(); // ✅ NOUVEAU

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

    // ✅ NOUVEAU: Écouter les messages une seule fois et broadcaster à tous les listeners
    this.socket.on('chat_message', (message: Message) => {
      console.log('📩 Message Socket reçu:', message);
      this.chatListeners.forEach(callback => callback(message));
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.chatListeners.clear(); // ✅ Nettoyer les listeners
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

  // ✅ NOUVEAU: Ajouter un listener au lieu de remplacer
  onChatMessage(callback: (message: Message) => void) {
    console.log('➕ Ajout listener chat');
    this.chatListeners.add(callback);
    
    // Retourner une fonction de cleanup
    return () => {
      console.log('➖ Retrait listener chat');
      this.chatListeners.delete(callback);
    };
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