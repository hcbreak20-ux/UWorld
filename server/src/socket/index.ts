import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';
 import { questService } from '../services/quest.service'; // ← TEMPORAIREMENT DÉSACTIVÉ

const prisma = new PrismaClient();

interface UserSocket extends Socket {
  userId?: string;
  username?: string;
  currentRoom?: string;
}

interface PlayerPosition {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

interface RoomPlayers {
  [roomId: string]: {
    [userId: string]: {
      username: string;
      position: PlayerPosition;
      avatar: any;
      avatarSkinColor: string;
      avatarHairColor: string;
      avatarShirtColor: string;
      avatarPantsColor: string;
    };
  };
}

// Stockage en mémoire des joueurs dans chaque salle
const roomPlayers: RoomPlayers = {};

export const initializeSocket = (server: HTTPServer) => {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware d'authentification Socket.IO
  io.use((socket: UserSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token manquant'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.username = payload.username;
      next();
    } catch (error) {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket: UserSocket) => {
    console.log(`Utilisateur connecté: ${socket.username} (${socket.userId})`);

    // ✅ NOUVEAU: Tracker le temps en ligne toutes les minutes
    const timeTrackingInterval = setInterval(async () => {
      if (socket.userId && socket.connected) {
        await questService.trackTimeOnline(socket.userId, 1); // 1 minute
      }
    }, 60000); // Toutes les 60 secondes (1 minute)

    // Nettoyer l'intervalle lors de la déconnexion
    socket.on('disconnect', () => {
      clearInterval(timeTrackingInterval);
      console.log(`Utilisateur déconnecté: ${socket.username}`);

      if (socket.currentRoom && socket.userId) {
        // Retirer le joueur
        if (roomPlayers[socket.currentRoom]) {
          delete roomPlayers[socket.currentRoom][socket.userId];

          // Notifier les autres
          socket.to(socket.currentRoom).emit('player_left', {
            userId: socket.userId,
          });
        }
      }
    });

    // Rejoindre une salle
    socket.on('join_room', async (roomId: string) => {
      try {
        // Vérifier que la salle existe
        const room = await prisma.room.findUnique({
          where: { id: roomId },
        });

        if (!room) {
          socket.emit('error', { message: 'Salle non trouvée' });
          return;
        }

        // Quitter l'ancienne salle si nécessaire
        if (socket.currentRoom) {
          socket.leave(socket.currentRoom);
          
          // Retirer le joueur de la liste
          if (roomPlayers[socket.currentRoom] && socket.userId) {
            delete roomPlayers[socket.currentRoom][socket.userId];
            
            // Notifier les autres joueurs
            io.to(socket.currentRoom).emit('player_left', {
              userId: socket.userId,
            });
          }
        }

        // Rejoindre la nouvelle salle
        socket.join(roomId);
        socket.currentRoom = roomId;

// Récupérer les infos du joueur
const user = await prisma.user.findUnique({
  where: { id: socket.userId },
  select: {
    id: true,
    username: true,
    avatar: true,
    avatarSkinColor: true,
    avatarHairColor: true,
    avatarShirtColor: true,
    avatarPantsColor: true,
  },
});

        if (!user) return;

        // Initialiser la salle dans roomPlayers si nécessaire
        if (!roomPlayers[roomId]) {
          roomPlayers[roomId] = {};
        }

// Ajouter le joueur avec position par défaut
roomPlayers[roomId][user.id] = {
  username: user.username,
  position: { x: 5, y: 5, direction: 'down' },
  avatar: user.avatar,
  avatarSkinColor: user.avatarSkinColor,
  avatarHairColor: user.avatarHairColor,
  avatarShirtColor: user.avatarShirtColor,
  avatarPantsColor: user.avatarPantsColor,
};

        // Envoyer les joueurs existants au nouveau joueur
        socket.emit('room_joined', {
          roomId,
          players: roomPlayers[roomId],
        });

// Notifier les autres joueurs qu'un nouveau joueur a rejoint
socket.to(roomId).emit('player_joined', {
  userId: user.id,
  username: user.username,
  position: roomPlayers[roomId][user.id].position,
  avatar: user.avatar,
  avatarSkinColor: user.avatarSkinColor,
  avatarHairColor: user.avatarHairColor,
  avatarShirtColor: user.avatarShirtColor,
  avatarPantsColor: user.avatarPantsColor,
});

        // ✅ NOUVEAU: Tracker la progression des quêtes
        if (socket.userId) {
          // Tracker les salles visitées
          await questService.trackProgress(socket.userId, 'visit_rooms', 1);
          
          // Tracker la connexion quotidienne (se fait à la première salle visitée)
          await questService.trackProgress(socket.userId, 'daily_login', 1);

          // ✅ NOUVEAU: Tracker les jours de connexion uniques
          await questService.trackLoginDay(socket.userId);
        }

        console.log(`${user.username} a rejoint la salle ${roomId}`);
      } catch (error) {
        console.error('Erreur join_room:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion à la salle' });
      }
    });

    // Mouvement du joueur
    socket.on('move', async (position: PlayerPosition) => {
      if (!socket.currentRoom || !socket.userId) return;

      // Mettre à jour la position
      if (roomPlayers[socket.currentRoom] && roomPlayers[socket.currentRoom][socket.userId]) {
        roomPlayers[socket.currentRoom][socket.userId].position = position;

        // Diffuser aux autres joueurs
        socket.to(socket.currentRoom).emit('player_moved', {
          userId: socket.userId,
          position,
        });

        // ✅ NOUVEAU: Tracker les déplacements pour les quêtes
        try {
          await questService.trackProgress(socket.userId, 'move_tiles', 1);
        } catch (error) {
          console.error('Erreur tracking move:', error);
        }
      }
    });

    // Message de chat
    socket.on('chat_message', async (data: { message: string; type?: string; whisperTarget?: string }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        const { message, type = 'normal', whisperTarget } = data;

        // Valider le message
        if (!message || message.trim().length === 0 || message.length > 500) {
          return;
        }

        // Sauvegarder dans la base de données
        const savedMessage = await prisma.message.create({
          data: {
            content: message.trim(),
            userId: socket.userId,
            roomId: socket.currentRoom,
            type: 'chat',
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                level: true,
              },
            },
          },
        });

        // Diffuser à tous les joueurs dans la salle (incluant l'expéditeur)
        io.to(socket.currentRoom).emit('chat_message', {
          id: savedMessage.id,
          content: savedMessage.content,
          user: savedMessage.user,
          createdAt: savedMessage.createdAt,
          type: type, // ← AJOUTÉ!
          whisperTarget: whisperTarget, // ← AJOUTÉ!
        });

        // ✅ Tracker les messages envoyés
        await questService.trackProgress(socket.userId, 'send_messages', 1);

        // ✅ NOUVEAU: Tracker les modes de chat utilisés
        if (type === 'shout') {
          await questService.trackChatMode(socket.userId, 'shout');
        } else if (type === 'whisper' || whisperTarget) {
          await questService.trackChatMode(socket.userId, 'whisper');
        } else {
          await questService.trackChatMode(socket.userId, 'normal');
        }
      } catch (error) {
        console.error('Erreur chat_message:', error);
      }
    });

    // Chuchotement (whisper)
    socket.on('whisper', async (data: { targetUserId: string; message: string }) => {
      if (!socket.userId) return;

      try {
        const { targetUserId, message } = data;

        if (!message || message.trim().length === 0 || message.length > 500) {
          return;
        }

        // Trouver le socket du destinataire
        const targetSocket = Array.from(io.sockets.sockets.values()).find(
          (s: any) => s.userId === targetUserId
        );

        if (!targetSocket) {
          socket.emit('error', { message: 'Utilisateur non trouvé ou hors ligne' });
          return;
        }

        const sender = await prisma.user.findUnique({
          where: { id: socket.userId },
          select: { id: true, username: true, avatar: true },
        });

        if (!sender) return;

        // Envoyer au destinataire
        targetSocket.emit('whisper_received', {
          from: sender,
          message: message.trim(),
          timestamp: new Date(),
        });

        // Confirmer à l'expéditeur
        socket.emit('whisper_sent', {
          to: targetUserId,
          message: message.trim(),
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Erreur whisper:', error);
      }
    });

    // Placement de meuble
    socket.on('placeFurniture', async (data: { furnitureId: string; x: number; y: number; rotation: number }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        // Diffuser aux autres joueurs
        socket.to(socket.currentRoom).emit('furniturePlaced', {
          userId: socket.userId,
          furniture: data,
        });

        // ✅ Tracker pour les quêtes
        await questService.trackProgress(socket.userId, 'place_furniture', 1);
      } catch (error) {
        console.error('Erreur placeFurniture:', error);
      }
    });

    // Ramassage de meuble
    socket.on('removeFurniture', async (data: { furnitureId: string }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        // Diffuser aux autres joueurs
        socket.to(socket.currentRoom).emit('furnitureRemoved', {
          userId: socket.userId,
          furnitureId: data.furnitureId,
        });

        // ✅ Tracker pour les quêtes
        await questService.trackProgress(socket.userId, 'pickup_furniture', 1);
      } catch (error) {
        console.error('Erreur removeFurniture:', error);
      }
    });

    // Rotation de meuble
    socket.on('rotateFurniture', async (data: { furnitureId: string; rotation: number }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        // Diffuser aux autres joueurs
        socket.to(socket.currentRoom).emit('furnitureRotated', {
          userId: socket.userId,
          furnitureId: data.furnitureId,
          rotation: data.rotation,
        });

        // ✅ Tracker pour les quêtes
        await questService.trackProgress(socket.userId, 'rotate_furniture', 1);
      } catch (error) {
        console.error('Erreur rotateFurniture:', error);
      }
    });
  });

  return io;
};
