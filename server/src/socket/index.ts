import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';
import { questService } from '../services/quest.service';
import { setSocketIO } from '../routes/message.routes';
import jwt from 'jsonwebtoken';
import { 
  setupAdminEvents, 
  registerUserSocket, 
  unregisterUserSocket,
  checkExpiredSanctions
} from './admin.socket';

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
      userId: string;
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

// Helper pour vérifier si un utilisateur est staff
function isStaff(role: string): boolean {
  return ['moderator', 'admin', 'owner'].includes(role);
}

// Helper pour vérifier le statut de ban
async function checkBanStatus(userId: string): Promise<{ isBanned: boolean; reason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, banExpiresAt: true, banReason: true },
    });

    if (!user?.isBanned) {
      return { isBanned: false };
    }

    // Vérifier si le ban est expiré
    if (user.banExpiresAt && new Date() > user.banExpiresAt) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banExpiresAt: null,
          banReason: null,
        },
      });
      return { isBanned: false };
    }

    return { isBanned: true, reason: user.banReason || 'Banni du serveur' };
  } catch (error) {
    console.error('[BAN CHECK] Erreur:', error);
    return { isBanned: false };
  }
}

export const initializeSocket = (server: HTTPServer) => {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware d'authentification Socket.IO
  io.use(async (socket: UserSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token manquant'));
    }

    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.username = payload.username;

      // Charger les infos complètes de l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          banExpiresAt: true,
          banReason: true,
          isMuted: true,
          muteExpiresAt: true,
          muteReason: true,
          isInvisible: true,
        },
      });

      if (!user) {
        return next(new Error('Utilisateur introuvable'));
      }

      // Vérifier si ban expiré
      if (user.isBanned && user.banExpiresAt && user.banExpiresAt < new Date()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            isBanned: false, 
            banExpiresAt: null, 
            banReason: null 
          }
        });
        user.isBanned = false;
      }

      // Vérifier si banni
      if (user.isBanned) {
        return next(new Error(`Vous êtes banni: ${user.banReason || 'Aucune raison'}`));
      }

      // Stocker les infos complètes dans socket.data
      socket.data.user = user;
      socket.data.position = { x: 5, y: 5 };

      next();
    } catch (error) {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', async (socket: UserSocket) => {
    console.log(`Utilisateur connecté: ${socket.username} (${socket.userId})`);

    // Enregistrer le socket pour les commandes admin
    if (socket.userId) {
      registerUserSocket(socket.userId, socket);
    }

    // Setup des événements admin
    setupAdminEvents(io, socket);

    // Tracker le temps en ligne toutes les minutes
    const timeTrackingInterval = setInterval(async () => {
      if (socket.userId && socket.connected) {
        await questService.trackTimeOnline(socket.userId, 1);
      }
    }, 60000);

    // ================================================
    // HANDLERS DE JEU
    // ================================================

    // Rejoindre une salle
    socket.on('join_room', async (roomId: string) => {
      try {
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
          
          if (roomPlayers[socket.currentRoom] && socket.userId) {
            delete roomPlayers[socket.currentRoom][socket.userId];
            
            io.to(socket.currentRoom).emit('player_left', {
              userId: socket.userId,
            });
          }
        }

        // Rejoindre la nouvelle salle
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.data.roomId = roomId;

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

        if (!roomPlayers[roomId]) {
          roomPlayers[roomId] = {};
        }

        roomPlayers[roomId][user.id] = {
          userId: user.id,
          username: user.username,
          position: { x: 5, y: 5, direction: 'down' },
          avatar: user.avatar,
          avatarSkinColor: user.avatarSkinColor,
          avatarHairColor: user.avatarHairColor,
          avatarShirtColor: user.avatarShirtColor,
          avatarPantsColor: user.avatarPantsColor,
        };

        socket.data.position = roomPlayers[roomId][user.id].position;

        socket.emit('room_joined', {
          roomId,
          players: roomPlayers[roomId],
        });

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

        if (socket.userId) {
          await questService.trackProgress(socket.userId, 'visit_rooms', 1);
          await questService.trackProgress(socket.userId, 'daily_login', 1);
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

      if (roomPlayers[socket.currentRoom] && roomPlayers[socket.currentRoom][socket.userId]) {
        roomPlayers[socket.currentRoom][socket.userId].position = position;
        socket.data.position = position;

        socket.to(socket.currentRoom).emit('player_moved', {
          userId: socket.userId,
          position,
        });

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

        if (!message || message.trim().length === 0) {
          return;
        }

        if (message.length > 500) {
          socket.emit('error', { message: 'Message trop long (max 500 caractères)' });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
          select: { 
            isMuted: true, 
            muteExpiresAt: true,
            muteReason: true,
            isBanned: true
          }
        });
        
        if (!user) return;
        
        if (user.isBanned) {
          socket.emit('error', { message: 'Vous êtes banni' });
          socket.disconnect(true);
          return;
        }
        
        if (user.isMuted && user.muteExpiresAt && user.muteExpiresAt < new Date()) {
          await prisma.user.update({
            where: { id: socket.userId },
            data: { isMuted: false, muteExpiresAt: null, muteReason: null }
          });
          user.isMuted = false;
        }
        
        if (user.isMuted) {
          socket.emit('error', { 
            message: `Vous êtes mute. Raison: ${user.muteReason || 'Non spécifiée'}`,
            type: 'muted'
          });
          return;
        }

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

        io.to(socket.currentRoom).emit('chat_message', {
          id: savedMessage.id,
          content: savedMessage.content,
          user: savedMessage.user,
          createdAt: savedMessage.createdAt,
          type: type,
          whisperTarget: whisperTarget,
        });

        await questService.trackProgress(socket.userId, 'send_messages', 1);

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

        if (socket.data.user?.isMuted) {
          socket.emit('error', { message: 'Vous êtes muté et ne pouvez pas chuchoter' });
          return;
        }

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

        targetSocket.emit('whisper_received', {
          from: sender,
          message: message.trim(),
          timestamp: new Date(),
        });

        socket.emit('whisper_sent', {
          to: targetUserId,
          message: message.trim(),
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Erreur whisper:', error);
      }
    });

    // Message privé
    socket.on('private_message', async (data: { receiverId: string; content: string }) => {
      try {
        const userId = socket.userId;
        if (!userId) return;
        
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            isMuted: true, 
            muteExpiresAt: true,
            muteReason: true,
            isBanned: true
          }
        });
        
        if (!user) return;
        
        if (user.isBanned) {
          socket.emit('error', { message: 'Vous êtes banni' });
          socket.disconnect(true);
          return;
        }
        
        if (user.isMuted && user.muteExpiresAt && user.muteExpiresAt < new Date()) {
          await prisma.user.update({
            where: { id: userId },
            data: { isMuted: false, muteExpiresAt: null, muteReason: null }
          });
          user.isMuted = false;
        }
        
        if (user.isMuted) {
          socket.emit('error', { 
            message: `Vous êtes mute et ne pouvez pas envoyer de MP. Raison: ${user.muteReason || 'Non spécifiée'}`,
            type: 'muted'
          });
          return;
        }
        
        // Logique pour sauvegarder et envoyer le message privé
        // À compléter selon votre implémentation
        
      } catch (error) {
        console.error('Erreur private_message:', error);
      }
    });

    // Placement de meuble
    socket.on('placeFurniture', async (data: { furnitureId: string; x: number; y: number; rotation: number }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        socket.to(socket.currentRoom).emit('furniturePlaced', {
          userId: socket.userId,
          furniture: data,
        });

        await questService.trackProgress(socket.userId, 'place_furniture', 1);
      } catch (error) {
        console.error('Erreur placeFurniture:', error);
      }
    });

    // Ramassage de meuble
    socket.on('removeFurniture', async (data: { furnitureId: string }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        socket.to(socket.currentRoom).emit('furnitureRemoved', {
          userId: socket.userId,
          furnitureId: data.furnitureId,
        });

        await questService.trackProgress(socket.userId, 'pickup_furniture', 1);
      } catch (error) {
        console.error('Erreur removeFurniture:', error);
      }
    });

    // Rotation de meuble
    socket.on('rotateFurniture', async (data: { furnitureId: string; rotation: number }) => {
      if (!socket.currentRoom || !socket.userId) return;

      try {
        socket.to(socket.currentRoom).emit('furnitureRotated', {
          userId: socket.userId,
          furnitureId: data.furnitureId,
          rotation: data.rotation,
        });

        await questService.trackProgress(socket.userId, 'rotate_furniture', 1);
      } catch (error) {
        console.error('Erreur rotateFurniture:', error);
      }
    });

    // ================================================
    // HANDLERS DE MODÉRATION
    // ================================================

    // WARN
    socket.on('moderation:warn', async (data: { targetUsername: string; reason: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('moderation:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.targetUsername },
        });

        if (!targetUser) {
          socket.emit('moderation:error', { message: 'Utilisateur introuvable' });
          return;
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            warnings: {
              increment: 1,
            },
          },
        });

        await prisma.adminLog.create({
          data: {
            action: 'WARN',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: data.reason,
          },
        });

        const targetSocket = Array.from(io.sockets.sockets.values()).find(
          (s: any) => s.userId === targetUser.id
        );

        if (targetSocket) {
          targetSocket.emit('moderation:warning', {
            message: `⚠️ AVERTISSEMENT de ${adminUser.username}: ${data.reason}`,
            moderator: adminUser.username,
            reason: data.reason,
            warningCount: targetUser.warnings + 1,
            timestamp: new Date().toISOString(),
          });

          targetSocket.emit('chat:system', {
            message: `⚠️ Avertissement #${targetUser.warnings + 1}: ${data.reason}`,
            type: 'warning',
            timestamp: new Date().toISOString(),
          });
        }

        socket.emit('moderation:success', {
          message: `${data.targetUsername} a reçu un avertissement (Total: ${targetUser.warnings + 1})`,
        });

        console.log(`[MODERATION] ${adminUser.username} a averti ${data.targetUsername}: ${data.reason}`);
      } catch (error) {
        console.error('[MODERATION] Erreur warn:', error);
        socket.emit('moderation:error', { message: 'Erreur serveur' });
      }
    });

    // MUTE
    socket.on('moderation:mute', async (data: { targetUsername: string; duration: number; reason: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('moderation:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.targetUsername },
        });

        if (!targetUser) {
          socket.emit('moderation:error', { message: 'Utilisateur introuvable' });
          return;
        }

        const muteExpiresAt = new Date();
        muteExpiresAt.setMinutes(muteExpiresAt.getMinutes() + data.duration);

        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            isMuted: true,
            muteExpiresAt: muteExpiresAt,
            muteReason: data.reason,
          },
        });

        await prisma.adminLog.create({
          data: {
            action: 'MUTE',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: data.reason,
          },
        });

        const targetSocket = Array.from(io.sockets.sockets.values()).find(
          (s: any) => s.userId === targetUser.id
        );

        if (targetSocket) {
          targetSocket.emit('moderation:muted', {
            duration: data.duration,
            reason: data.reason,
            muteExpiresAt: muteExpiresAt.toISOString(),
          });

          targetSocket.emit('chat:system', {
            message: `🔇 Vous avez été rendu muet pour ${data.duration} minutes: ${data.reason}`,
            type: 'error',
            timestamp: new Date().toISOString(),
          });
        }

        socket.emit('moderation:success', {
          message: `${data.targetUsername} a été rendu muet pour ${data.duration} minutes`,
        });

        console.log(`[MODERATION] ${adminUser.username} a mute ${data.targetUsername} pour ${data.duration}min`);
      } catch (error) {
        console.error('[MODERATION] Erreur mute:', error);
        socket.emit('moderation:error', { message: 'Erreur serveur' });
      }
    });

    // KICK
    socket.on('moderation:kick', async (data: { targetUsername: string; reason: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('moderation:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.targetUsername },
        });

        if (!targetUser) {
          socket.emit('moderation:error', { message: 'Utilisateur introuvable' });
          return;
        }

        await prisma.adminLog.create({
          data: {
            action: 'KICK',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: data.reason,
          },
        });

        const targetSocket = Array.from(io.sockets.sockets.values()).find(
          (s: any) => s.userId === targetUser.id
        );

        if (targetSocket) {
          targetSocket.emit('moderation:kicked', {
            reason: data.reason,
            moderator: adminUser.username,
          });

          setTimeout(() => {
            targetSocket.disconnect(true);
          }, 1000);
        }

        socket.emit('moderation:success', {
          message: `${data.targetUsername} a été expulsé`,
        });

        console.log(`[MODERATION] ${adminUser.username} a kick ${data.targetUsername}: ${data.reason}`);
      } catch (error) {
        console.error('[MODERATION] Erreur kick:', error);
        socket.emit('moderation:error', { message: 'Erreur serveur' });
      }
    });

    // BAN
    socket.on('moderation:ban', async (data: { targetUsername: string; reason: string; duration?: number }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('moderation:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.targetUsername },
        });

        if (!targetUser) {
          socket.emit('moderation:error', { message: 'Utilisateur introuvable' });
          return;
        }

        let banExpiresAt: Date | null = null;
        if (data.duration) {
          banExpiresAt = new Date();
          banExpiresAt.setMinutes(banExpiresAt.getMinutes() + data.duration);
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            isBanned: true,
            banExpiresAt: banExpiresAt,
            banReason: data.reason,
          },
        });

        await prisma.adminLog.create({
          data: {
            action: 'BAN',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: data.reason,
          },
        });

        const targetSocket = Array.from(io.sockets.sockets.values()).find(
          (s: any) => s.userId === targetUser.id
        );

        if (targetSocket) {
          targetSocket.emit('moderation:banned', {
            reason: data.reason,
            permanent: !data.duration,
            expiresAt: banExpiresAt?.toISOString(),
          });

          setTimeout(() => {
            targetSocket.disconnect(true);
          }, 1000);
        }

        const banMessage = data.duration
          ? `${data.targetUsername} a été banni pour ${data.duration} minutes`
          : `${data.targetUsername} a été banni définitivement`;

        socket.emit('moderation:success', { message: banMessage });

        console.log(`[MODERATION] ${adminUser.username} a banni ${data.targetUsername}: ${data.reason}`);
      } catch (error) {
        console.error('[MODERATION] Erreur ban:', error);
        socket.emit('moderation:error', { message: 'Erreur serveur' });
      }
    });

    // UNMUTE
    socket.on('moderation:unmute', async (data: { targetUsername: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('moderation:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.targetUsername },
        });

        if (!targetUser) {
          socket.emit('moderation:error', { message: 'Utilisateur introuvable' });
          return;
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            isMuted: false,
            muteExpiresAt: null,
            muteReason: null,
          },
        });

        await prisma.adminLog.create({
          data: {
            action: 'UNMUTE',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: 'Unmute manuel',
          },
        });

        socket.emit('moderation:success', {
          message: `${data.targetUsername} peut maintenant parler`,
        });

        console.log(`[MODERATION] ${adminUser.username} a unmute ${data.targetUsername}`);
      } catch (error) {
        console.error('[MODERATION] Erreur unmute:', error);
        socket.emit('moderation:error', { message: 'Erreur serveur' });
      }
    });

    // UNBAN
    socket.on('moderation:unban', async (data: { targetUsername: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('moderation:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.targetUsername },
        });

        if (!targetUser) {
          socket.emit('moderation:error', { message: 'Utilisateur introuvable' });
          return;
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            isBanned: false,
            banExpiresAt: null,
            banReason: null,
          },
        });

        await prisma.adminLog.create({
          data: {
            action: 'UNBAN',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: 'Unban manuel',
          },
        });

        socket.emit('moderation:success', {
          message: `${data.targetUsername} a été débanni`,
        });

        console.log(`[MODERATION] ${adminUser.username} a unban ${data.targetUsername}`);
      } catch (error) {
        console.error('[MODERATION] Erreur unban:', error);
        socket.emit('moderation:error', { message: 'Erreur serveur' });
      }
    });

    // ================================================
    // HANDLERS ADMIN / STATS
    // ================================================

    // Obtenir les stats générales
    socket.on('admin:getStats', async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const totalUsers = await prisma.user.count();
        const totalBanned = await prisma.user.count({ where: { isBanned: true } });
        const totalMuted = await prisma.user.count({ where: { isMuted: true } });
        const totalRooms = await prisma.room.count();

        socket.emit('admin:stats', {
          totalUsers,
          totalBanned,
          totalMuted,
          totalRooms,
        });
      } catch (error) {
        console.error('[ADMIN] Erreur stats:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Obtenir la liste des utilisateurs
    socket.on('admin:getUsers', async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const users = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            level: true,
            role: true,
            isBanned: true,
            isMuted: true,
            warnings: true,
            coins: true,
            gems: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        socket.emit('admin:users', users);
      } catch (error) {
        console.error('[ADMIN] Erreur users:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Obtenir les utilisateurs bannis
    socket.on('admin:getBannedUsers', async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const bannedUsers = await prisma.user.findMany({
          where: { isBanned: true },
          select: {
            id: true,
            username: true,
            email: true,
            banReason: true,
            banExpiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        socket.emit('admin:bannedUsers', bannedUsers);
      } catch (error) {
        console.error('[ADMIN] Erreur banned users:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Obtenir les utilisateurs mutes
    socket.on('admin:getMutedUsers', async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const mutedUsers = await prisma.user.findMany({
          where: { isMuted: true },
          select: {
            id: true,
            username: true,
            email: true,
            muteReason: true,
            muteExpiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        socket.emit('admin:mutedUsers', mutedUsers);
      } catch (error) {
        console.error('[ADMIN] Erreur muted users:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Obtenir la liste des salles
    socket.on('admin:getRooms', async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const rooms = await prisma.room.findMany({
          select: {
            id: true,
            name: true,
            ownerId: true,
            maxPlayers: true,
            createdAt: true,
            owner: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        socket.emit('admin:rooms', rooms);
      } catch (error) {
        console.error('[ADMIN] Erreur rooms:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Obtenir les logs admin
    socket.on('admin:getLogs', async () => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const logs = await prisma.adminLog.findMany({
          include: {
            admin: {
              select: { username: true },
            },
            targetUser: {
              select: { username: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        socket.emit('admin:logs', logs);
      } catch (error) {
        console.error('[ADMIN] Erreur logs:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Supprimer un log
    socket.on('admin:deleteLog', async (data: { logId: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        await prisma.adminLog.delete({
          where: { id: data.logId },
        });

        socket.emit('admin:success', { message: 'Log supprimé' });
        
        console.log(`[ADMIN] ${adminUser.username} a supprimé le log #${data.logId}`);
      } catch (error) {
        console.error('[ADMIN] Erreur delete log:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Supprimer plusieurs logs
    socket.on('admin:deleteLogs', async (data: { logIds: string[] }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        await prisma.adminLog.deleteMany({
          where: {
            id: {
              in: data.logIds,
            },
          },
        });

        socket.emit('admin:success', { message: `${data.logIds.length} logs supprimés` });
        
        console.log(`[ADMIN] ${adminUser.username} a supprimé ${data.logIds.length} logs`);
      } catch (error) {
        console.error('[ADMIN] Erreur delete logs:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Obtenir les détails d'un utilisateur
    socket.on('admin:getUserDetails', async (data: { username: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { username: data.username },
          select: {
            id: true,
            username: true,
            email: true,
            level: true,
            experience: true,
            coins: true,
            gems: true,
            role: true,
            isBanned: true,
            banReason: true,
            banExpiresAt: true,
            isMuted: true,
            muteReason: true,
            muteExpiresAt: true,
            warnings: true,
            isInvisible: true,
            createdAt: true,
            lastLogin: true,
          },
        });

        if (!user) {
          socket.emit('admin:error', { message: 'Utilisateur introuvable' });
          return;
        }

        const userLogs = await prisma.adminLog.findMany({
          where: {
            targetUserId: user.id,
          },
          include: {
            admin: {
              select: { username: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        socket.emit('admin:userDetails', {
          user,
          logs: userLogs,
        });
      } catch (error) {
        console.error('[ADMIN] Erreur getUserDetails:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Modifier le rôle d'un utilisateur
    socket.on('admin:setRole', async (data: { username: string; role: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !['admin', 'owner'].includes(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.username },
        });

        if (!targetUser) {
          socket.emit('admin:error', { message: 'Utilisateur introuvable' });
          return;
        }

        if (targetUser.role === 'owner' && adminUser.role !== 'owner') {
          socket.emit('admin:error', { message: 'Vous ne pouvez pas modifier le rôle d\'un owner' });
          return;
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: { role: data.role },
        });

        await prisma.adminLog.create({
          data: {
            action: 'ROLE_CHANGE',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: `Rôle changé en ${data.role}`,
          },
        });

        socket.emit('admin:success', {
          message: `Rôle de ${data.username} changé en ${data.role}`,
        });

        console.log(`[ADMIN] ${adminUser.username} a changé le rôle de ${data.username} en ${data.role}`);
      } catch (error) {
        console.error('[ADMIN] Erreur setRole:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // Réinitialiser les warnings
    socket.on('admin:resetWarnings', async (data: { username: string }) => {
      try {
        const adminUser = await prisma.user.findUnique({
          where: { id: socket.userId },
        });

        if (!adminUser || !isStaff(adminUser.role)) {
          socket.emit('admin:error', { message: 'Accès refusé' });
          return;
        }

        const targetUser = await prisma.user.findUnique({
          where: { username: data.username },
        });

        if (!targetUser) {
          socket.emit('admin:error', { message: 'Utilisateur introuvable' });
          return;
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: { warnings: 0 },
        });

        await prisma.adminLog.create({
          data: {
            action: 'RESET_WARNINGS',
            adminId: adminUser.id,
            targetUserId: targetUser.id,
            reason: 'Réinitialisation des avertissements',
          },
        });

        socket.emit('admin:success', {
          message: `Avertissements de ${data.username} réinitialisés`,
        });

        console.log(`[ADMIN] ${adminUser.username} a réinitialisé les warnings de ${data.username}`);
      } catch (error) {
        console.error('[ADMIN] Erreur resetWarnings:', error);
        socket.emit('admin:error', { message: 'Erreur serveur' });
      }
    });

    // ================================================
    // DÉCONNEXION
    // ================================================
    socket.on('disconnect', () => {
      clearInterval(timeTrackingInterval);
      console.log(`Utilisateur déconnecté: ${socket.username}`);

      if (socket.userId) {
        unregisterUserSocket(socket.userId);
      }

      if (socket.currentRoom && socket.userId) {
        if (roomPlayers[socket.currentRoom]) {
          delete roomPlayers[socket.currentRoom][socket.userId];

          socket.to(socket.currentRoom).emit('player_left', {
            userId: socket.userId,
          });
        }
      }
    });
  });

  setSocketIO(io);

  // Vérifier les bans/mutes expirés toutes les minutes
  setInterval(() => {
    checkExpiredSanctions();
  }, 60 * 1000);

  return io;
};