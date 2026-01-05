import { Server, Socket } from 'socket.io';
import { prisma } from '../db';
import { 
  hasPermission, 
  canActOnTarget,
  UserRole,
  parseDuration
} from '../middleware/admin.middleware';

// Map pour suivre les sockets par userId
const userSockets = new Map<string, Socket>();

/**
 * Enregistrer un socket
 */
export function registerUserSocket(userId: string, socket: Socket) {
  userSockets.set(userId, socket);
}

/**
 * Désenregistrer un socket
 */
export function unregisterUserSocket(userId: string) {
  userSockets.delete(userId);
}

/**
 * Trouver un socket par userId
 */
export function findSocketByUserId(userId: string): Socket | undefined {
  return userSockets.get(userId);
}

/**
 * Trouver un userId par socket
 */
export function findUserIdBySocket(socket: Socket): string | undefined {
  for (const [userId, s] of userSockets.entries()) {
    if (s.id === socket.id) {
      return userId;
    }
  }
  return undefined;
}

/**
 * Configuration des événements admin Socket.IO
 */
export function setupAdminEvents(io: Server, socket: Socket) {
  
  // ==================
  // KICK
  // ==================
  
  socket.on('admin:kick', async (data: { targetUsername: string; reason: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'kick')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      // Trouver l'utilisateur cible
      const target = await prisma.user.findUnique({
        where: { username: data.targetUsername }
      });
      
      if (!target) {
        return socket.emit('admin:error', { message: 'Utilisateur introuvable' });
      }
      
      // Vérifier hiérarchie
      if (!canActOnTarget(admin.role as UserRole, target.role as UserRole)) {
        return socket.emit('admin:error', { 
          message: 'Impossible de kick un utilisateur de rang égal ou supérieur' 
        });
      }
      
      // Trouver le socket du joueur
      const targetSocket = findSocketByUserId(target.id);
      
      if (targetSocket) {
        // Envoyer notification de kick
        targetSocket.emit('kicked', {
          reason: data.reason,
          by: admin.username,
          timestamp: new Date()
        });
        
        // Déconnecter après 2 secondes
        setTimeout(() => {
          targetSocket.disconnect(true);
        }, 2000);
      }
      
      // Logger
      await prisma.adminLog.create({
        data: {
          adminId: admin.id,
          targetUserId: target.id,
          action: 'kick',
          reason: data.reason
        }
      });
      
      socket.emit('admin:success', { 
        message: `${data.targetUsername} a été expulsé` 
      });
      
    } catch (error) {
      console.error('Erreur kick:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // TELEPORT
  // ==================
  
  socket.on('admin:teleport', async (data: { targetUsername: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'teleport')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      const target = await prisma.user.findUnique({
        where: { username: data.targetUsername }
      });
      
      if (!target) {
        return socket.emit('admin:error', { message: 'Utilisateur introuvable' });
      }
      
      const targetSocket = findSocketByUserId(target.id);
      
      if (!targetSocket) {
        return socket.emit('admin:error', { 
          message: 'Utilisateur non connecté' 
        });
      }
      
      // Obtenir la position du joueur cible
      const targetPosition = targetSocket.data.position;
      
      if (!targetPosition) {
        return socket.emit('admin:error', { 
          message: 'Position du joueur introuvable' 
        });
      }
      
      // Téléporter l'admin vers le joueur
      socket.emit('force_teleport', {
        x: targetPosition.x,
        y: targetPosition.y,
        roomId: targetSocket.data.roomId
      });
      
      socket.emit('admin:success', { 
        message: `Téléporté vers ${data.targetUsername}` 
      });
      
    } catch (error) {
      console.error('Erreur teleport:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // SUMMON (Invoquer)
  // ==================
  
  socket.on('admin:summon', async (data: { targetUsername: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'summon')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      const target = await prisma.user.findUnique({
        where: { username: data.targetUsername }
      });
      
      if (!target) {
        return socket.emit('admin:error', { message: 'Utilisateur introuvable' });
      }
      
      const targetSocket = findSocketByUserId(target.id);
      
      if (!targetSocket) {
        return socket.emit('admin:error', { 
          message: 'Utilisateur non connecté' 
        });
      }
      
      // Obtenir la position de l'admin
      const adminPosition = socket.data.position;
      
      if (!adminPosition) {
        return socket.emit('admin:error', { 
          message: 'Position admin introuvable' 
        });
      }
      
      // Téléporter le joueur vers l'admin
      targetSocket.emit('force_teleport', {
        x: adminPosition.x,
        y: adminPosition.y,
        roomId: socket.data.roomId
      });
      
      targetSocket.emit('system_message', {
        message: `Vous avez été invoqué par ${admin.username}`,
        type: 'admin'
      });
      
      socket.emit('admin:success', { 
        message: `${data.targetUsername} invoqué` 
      });
      
    } catch (error) {
      console.error('Erreur summon:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // FREEZE/UNFREEZE
  // ==================
  
  socket.on('admin:freeze', async (data: { targetUsername: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'freeze')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      const target = await prisma.user.findUnique({
        where: { username: data.targetUsername }
      });
      
      if (!target) {
        return socket.emit('admin:error', { message: 'Utilisateur introuvable' });
      }
      
      if (!canActOnTarget(admin.role as UserRole, target.role as UserRole)) {
        return socket.emit('admin:error', { 
          message: 'Impossible de freeze un utilisateur de rang égal ou supérieur' 
        });
      }
      
      const targetSocket = findSocketByUserId(target.id);
      
      if (targetSocket) {
        targetSocket.emit('frozen', {
          by: admin.username,
          timestamp: new Date()
        });
        
        // Marquer comme frozen dans socket.data
        targetSocket.data.frozen = true;
      }
      
      socket.emit('admin:success', { 
        message: `${data.targetUsername} gelé` 
      });
      
    } catch (error) {
      console.error('Erreur freeze:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  socket.on('admin:unfreeze', async (data: { targetUsername: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'freeze')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      const target = await prisma.user.findUnique({
        where: { username: data.targetUsername }
      });
      
      if (!target) {
        return socket.emit('admin:error', { message: 'Utilisateur introuvable' });
      }
      
      const targetSocket = findSocketByUserId(target.id);
      
      if (targetSocket) {
        targetSocket.emit('unfrozen');
        targetSocket.data.frozen = false;
      }
      
      socket.emit('admin:success', { 
        message: `${data.targetUsername} dégelé` 
      });
      
    } catch (error) {
      console.error('Erreur unfreeze:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // ANNONCE GLOBALE
  // ==================
  
  socket.on('admin:announce', async (data: { message: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'send_announcements')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      // Envoyer à tous les joueurs connectés
      io.emit('global_announcement', {
        message: data.message,
        from: admin.username,
        role: admin.role,
        timestamp: new Date()
      });
      
      // Logger
      await prisma.adminLog.create({
        data: {
          adminId: admin.id,
          action: 'announce',
          details: {
            message: data.message
          }
        }
      });
      
      socket.emit('admin:success', { 
        message: 'Annonce envoyée' 
      });
      
    } catch (error) {
      console.error('Erreur announce:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // ALERTE DANS UNE SALLE
  // ==================
  
  socket.on('admin:room_alert', async (data: { message: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'send_announcements')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      const roomId = socket.data.roomId;
      
      if (!roomId) {
        return socket.emit('admin:error', { 
          message: 'Vous devez être dans une salle' 
        });
      }
      
      // Envoyer à tous dans la salle
      io.to(`room:${roomId}`).emit('room_alert', {
        message: data.message,
        from: admin.username,
        role: admin.role,
        timestamp: new Date()
      });
      
      socket.emit('admin:success', { 
        message: 'Alerte envoyée dans la salle' 
      });
      
    } catch (error) {
      console.error('Erreur room alert:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // MODE INVISIBLE
  // ==================
  
  socket.on('admin:set_invisible', async (data: { invisible: boolean }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'invisible_mode')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      // Mettre à jour dans la base
      await prisma.user.update({
        where: { id: admin.id },
        data: { isInvisible: data.invisible }
      });
      
      // Mettre à jour dans socket.data
      socket.data.user.isInvisible = data.invisible;
      
      // Notifier la salle
      const roomId = socket.data.roomId;
      if (roomId) {
        if (data.invisible) {
          // Disparaître
          io.to(`room:${roomId}`).emit('player_left', {
            userId: admin.id
          });
        } else {
          // Réapparaître
          io.to(`room:${roomId}`).emit('player_joined', {
            user: admin,
            position: socket.data.position
          });
        }
      }
      
      socket.emit('admin:success', { 
        message: data.invisible ? 'Mode invisible activé' : 'Mode invisible désactivé'
      });
      
    } catch (error) {
      console.error('Erreur invisible mode:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // VERROUILLER SALLE
  // ==================
  
  socket.on('admin:lock_room', async (data: { roomId: number }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'lock_room')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      // Marquer la salle comme verrouillée
      // (Tu devras ajouter un champ `isLocked` au modèle Room)
      
      // Notifier tous les joueurs de la salle
      io.to(`room:${data.roomId}`).emit('room_locked', {
        by: admin.username,
        timestamp: new Date()
      });
      
      socket.emit('admin:success', { 
        message: 'Salle verrouillée' 
      });
      
    } catch (error) {
      console.error('Erreur lock room:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
  
  // ==================
  // VIDER UNE SALLE
  // ==================
  
  socket.on('admin:clear_room', async (data: { roomId: number; reason?: string }) => {
    const admin = socket.data.user;
    
    if (!admin || !hasPermission(admin.role as UserRole, 'clear_room')) {
      return socket.emit('admin:error', { message: 'Permission refusée' });
    }
    
    try {
      // Trouver tous les sockets dans la salle
      const socketsInRoom = await io.in(`room:${data.roomId}`).fetchSockets();
      
      let kickedCount = 0;
      
      for (const s of socketsInRoom) {
        const user = s.data.user;
        
        // Ne pas kick l'admin lui-même
        if (user && user.id !== admin.id) {
          // Ne kick que les utilisateurs de rang inférieur
          if (canActOnTarget(admin.role as UserRole, user.role as UserRole)) {
            s.emit('kicked', {
              reason: data.reason || 'Salle vidée par un admin',
              by: admin.username
            });
            
            // Retirer de la salle
            s.leave(`room:${data.roomId}`);
            kickedCount++;
          }
        }
      }
      
      socket.emit('admin:success', { 
        message: `${kickedCount} joueur(s) expulsé(s)` 
      });
      
    } catch (error) {
      console.error('Erreur clear room:', error);
      socket.emit('admin:error', { message: 'Erreur serveur' });
    }
  });
}

/**
 * Vérifier les bans/mutes expirés (à appeler périodiquement)
 */
export async function checkExpiredSanctions() {
  const now = new Date();
  
  try {
    // Débannir automatiquement
    await prisma.user.updateMany({
      where: {
        isBanned: true,
        banExpiresAt: {
          lte: now,
          not: null
        }
      },
      data: {
        isBanned: false,
        banExpiresAt: null,
        banReason: null
      }
    });
    
    // Unmute automatiquement
    await prisma.user.updateMany({
      where: {
        isMuted: true,
        muteExpiresAt: {
          lte: now,
          not: null
        }
      },
      data: {
        isMuted: false,
        muteExpiresAt: null,
        muteReason: null
      }
    });
    
  } catch (error) {
    console.error('Erreur vérification sanctions:', error);
  }
}
