import { Router } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { 
  requireRole, 
  requirePermission,
  UserRole,
  canActOnTarget,
  validateDuration,
  parseDuration,
  formatDuration
} from '../middleware/admin.middleware';

const router = Router();

// ✅ CRITIQUE: Appliquer authMiddleware à TOUTES les routes admin
router.use(authMiddleware);

// ✅ Socket.IO instance (à injecter depuis index.ts)
let io: any = null;

export const setSocketIO = (socketIO: any) => {
  io = socketIO;
};

// ==================
// MODÉRATION
// ==================

/**
 * Bannir un joueur
 * POST /api/admin/ban
 */
router.post('/ban', requirePermission('ban_temporary'), async (req, res) => {
  const { targetUsername, duration, reason } = req.body;
  const admin = (req as any).user;
  
  try {
    if (!targetUsername || !duration || !reason) {
      return res.status(400).json({ 
        error: 'Paramètres manquants',
        required: ['targetUsername', 'duration', 'reason']
      });
    }
    
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    if (!canActOnTarget(admin.role as UserRole, target.role as UserRole)) {
      return res.status(403).json({ 
        error: 'Impossible de bannir un utilisateur de rang égal ou supérieur' 
      });
    }
    
    const durationCheck = validateDuration(admin.role as UserRole, duration);
    if (!durationCheck.valid) {
      return res.status(403).json({ error: durationCheck.error });
    }
    
    let banExpiresAt = null;
    if (duration !== 'permanent') {
      const durationMs = parseDuration(duration);
      banExpiresAt = new Date(Date.now() + durationMs);
    }
    
    await prisma.user.update({
      where: { id: target.id },
      data: {
        isBanned: true,
        banExpiresAt,
        banReason: reason
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'ban',
        reason,
        details: {
          duration,
          expiresAt: banExpiresAt,
          permanent: duration === 'permanent'
        }
      }
    });
    
    // ✅ NOUVEAU: Déconnecter le joueur via Socket.IO
    if (io) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find((s: any) => s.userId === target.id);
      
      if (targetSocket) {
        targetSocket.emit('banned', {
          reason,
          duration,
          expiresAt: banExpiresAt
        });
        targetSocket.disconnect(true);
        console.log(`🚫 ${targetUsername} banni et déconnecté`);
      }
    }
    
    res.json({ 
      success: true,
      message: `${targetUsername} a été banni`,
      duration,
      expiresAt: banExpiresAt,
      reason
    });
    
  } catch (error) {
    console.error('Erreur ban:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Débannir un joueur
 * POST /api/admin/unban
 */
router.post('/unban', requirePermission('unban'), async (req, res) => {
  const { targetUsername } = req.body;
  const admin = (req as any).user;
  
  try {
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    if (!target.isBanned) {
      return res.status(400).json({ error: 'Cet utilisateur n\'est pas banni' });
    }
    
    await prisma.user.update({
      where: { id: target.id },
      data: {
        isBanned: false,
        banExpiresAt: null,
        banReason: null
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'unban',
        reason: `Débanni par ${admin.username}`
      }
    });
    
    res.json({ 
      success: true, 
      message: `${targetUsername} a été débanni` 
    });
    
  } catch (error) {
    console.error('Erreur unban:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Mute un joueur
 * POST /api/admin/mute
 */
router.post('/mute', requirePermission('mute_temporary'), async (req, res) => {
  const { targetUsername, duration, reason } = req.body;
  const admin = (req as any).user;
  
  try {
    if (!targetUsername || !duration || !reason) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    if (!canActOnTarget(admin.role as UserRole, target.role as UserRole)) {
      return res.status(403).json({ 
        error: 'Impossible de mute un utilisateur de rang égal ou supérieur' 
      });
    }
    
    const durationCheck = validateDuration(admin.role as UserRole, duration);
    if (!durationCheck.valid) {
      return res.status(403).json({ error: durationCheck.error });
    }
    
    let muteExpiresAt = null;
    if (duration !== 'permanent') {
      const durationMs = parseDuration(duration);
      muteExpiresAt = new Date(Date.now() + durationMs);
    }
    
    await prisma.user.update({
      where: { id: target.id },
      data: {
        isMuted: true,
        muteExpiresAt,
        muteReason: reason
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'mute',
        reason,
        details: {
          duration,
          expiresAt: muteExpiresAt
        }
      }
    });
    
    // ✅ NOUVEAU: Notifier le joueur via Socket.IO
    if (io) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find((s: any) => s.userId === target.id);
      
      if (targetSocket) {
        targetSocket.emit('muted', {
          reason,
          duration,
          expiresAt: muteExpiresAt
        });
        console.log(`🔇 ${targetUsername} mute et notifié`);
      }
    }
    
    res.json({ 
      success: true,
      message: `${targetUsername} a été mute`,
      duration,
      expiresAt: muteExpiresAt
    });
    
  } catch (error) {
    console.error('Erreur mute:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Unmute un joueur
 * POST /api/admin/unmute
 */
router.post('/unmute', requirePermission('unmute'), async (req, res) => {
  const { targetUsername } = req.body;
  const admin = (req as any).user;
  
  try {
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    await prisma.user.update({
      where: { id: target.id },
      data: {
        isMuted: false,
        muteExpiresAt: null,
        muteReason: null
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'unmute',
        reason: `Unmute par ${admin.username}`
      }
    });
    
    // ✅ NOUVEAU: Notifier le joueur
    if (io) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find((s: any) => s.userId === target.id);
      
      if (targetSocket) {
        targetSocket.emit('unmuted');
        console.log(`🔊 ${targetUsername} unmute et notifié`);
      }
    }
    
    res.json({ success: true, message: `${targetUsername} peut à nouveau parler` });
    
  } catch (error) {
    console.error('Erreur unmute:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * ✅ NOUVEAU: Avertir un joueur avec notification Socket.IO
 * POST /api/admin/warn
 */
router.post('/warn', requirePermission('warn'), async (req, res) => {
  const { targetUsername, reason } = req.body;
  const admin = (req as any).user;
  
  try {
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        warnings: { increment: 1 }
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'warn',
        reason,
        details: {
          warningCount: updated.warnings
        }
      }
    });
    
    // ✅ NOUVEAU: Envoyer notification warning au joueur
    if (io) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find((s: any) => s.userId === target.id);
      
      if (targetSocket) {
        targetSocket.emit('warning', {
          reason,
          warningCount: updated.warnings,
          adminUsername: admin.username
        });
        console.log(`⚠️ ${targetUsername} averti (${updated.warnings} warnings)`);
      }
    }
    
    res.json({ 
      success: true,
      message: `${targetUsername} a été averti`,
      warnings: updated.warnings
    });
    
  } catch (error) {
    console.error('Erreur warn:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * ✅ NOUVEAU: Kick un joueur (déconnecter immédiatement)
 * POST /api/admin/kick
 */
router.post('/kick', requirePermission('kick'), async (req, res) => {
  const { targetUsername, reason } = req.body;
  const admin = (req as any).user;
  
  try {
    if (!targetUsername || !reason) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    if (!canActOnTarget(admin.role as UserRole, target.role as UserRole)) {
      return res.status(403).json({ 
        error: 'Impossible de kick un utilisateur de rang égal ou supérieur' 
      });
    }
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'kick',
        reason
      }
    });
    
    // ✅ Déconnecter le joueur via Socket.IO
    if (io) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find((s: any) => s.userId === target.id);
      
      if (targetSocket) {
        targetSocket.emit('kicked', { reason, adminUsername: admin.username });
        setTimeout(() => {
          targetSocket.disconnect(true);
        }, 1000); // 1 seconde pour recevoir le message
        console.log(`👢 ${targetUsername} kické`);
      } else {
        return res.status(404).json({ error: 'Joueur non connecté' });
      }
    } else {
      return res.status(500).json({ error: 'Socket.IO non disponible' });
    }
    
    res.json({ 
      success: true,
      message: `${targetUsername} a été expulsé`,
      reason
    });
    
  } catch (error) {
    console.error('Erreur kick:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================
// BADGES
// ==================

/**
 * Donner un badge
 * POST /api/admin/badge/give
 */
router.post('/badge/give', requirePermission('give_event_badges'), async (req, res) => {
  const { targetUsername, badgeCode } = req.body;
  const admin = (req as any).user;
  
  try {
    if (!targetUsername || !badgeCode) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }
    
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    const badge = await prisma.badge.findUnique({
      where: { key: badgeCode }
    });
    
    if (!target || !badge) {
      return res.status(404).json({ error: 'Utilisateur ou badge introuvable' });
    }
    
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: target.id,
          badgeId: badge.id
        }
      }
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: `${targetUsername} possède déjà ce badge` 
      });
    }
    
    await prisma.userBadge.create({
      data: {
        userId: target.id,
        badgeId: badge.id,
        givenBy: admin.userId
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'give_badge',
        details: { 
          badgeCode,
          badgeName: badge.name
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `Badge "${badge.name}" donné à ${targetUsername}` 
    });
    
  } catch (error) {
    console.error('Erreur give badge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Retirer un badge
 * POST /api/admin/badge/remove
 */
router.post('/badge/remove', requirePermission('remove_badge'), async (req, res) => {
  const { targetUsername, badgeCode } = req.body;
  const admin = (req as any).user;
  
  try {
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    const badge = await prisma.badge.findUnique({
      where: { key: badgeCode }
    });
    
    if (!target || !badge) {
      return res.status(404).json({ error: 'Utilisateur ou badge introuvable' });
    }
    
    const userBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: target.id,
          badgeId: badge.id
        }
      }
    });
    
    if (!userBadge) {
      return res.status(404).json({ 
        error: `${targetUsername} ne possède pas ce badge` 
      });
    }
    
    await prisma.userBadge.delete({
      where: {
        userId_badgeId: {
          userId: target.id,
          badgeId: badge.id
        }
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'remove_badge',
        details: { 
          badgeCode,
          badgeName: badge.name
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `Badge "${badge.name}" retiré à ${targetUsername}` 
    });
    
  } catch (error) {
    console.error('Erreur remove badge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================
// ÉCONOMIE
// ==================

/**
 * Donner des uCoins
 * POST /api/admin/coins/give
 */
router.post('/coins/give', requirePermission('give_coins'), async (req, res) => {
  const { targetUsername, amount } = req.body;
  const admin = (req as any).user;
  
  try {
    if (!targetUsername || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Paramètres invalides' });
    }
    
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        coins: { increment: amount }
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'give_coins',
        details: { 
          amount,
          newBalance: updated.coins
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `${amount} uCoins donnés à ${targetUsername}`,
      newBalance: updated.coins
    });
    
  } catch (error) {
    console.error('Erreur give coins:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Donner des uNuggets
 * POST /api/admin/nuggets/give
 */
router.post('/nuggets/give', requirePermission('give_nuggets'), async (req, res) => {
  const { targetUsername, amount } = req.body;
  const admin = (req as any).user;
  
  try {
    if (!targetUsername || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Paramètres invalides' });
    }
    
    const target = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        gems: { increment: amount }
      }
    });
    
    await prisma.adminLog.create({
      data: {
        adminId: admin.userId,
        targetUserId: target.id,
        action: 'give_nuggets',
        details: { 
          amount,
          newBalance: updated.gems
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `${amount} uNuggets donnés à ${targetUsername}`,
      newBalance: updated.gems
    });
    
  } catch (error) {
    console.error('Erreur give nuggets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================
// INFORMATIONS
// ==================

/**
 * Obtenir les infos d'un joueur
 * GET /api/admin/user/:username
 */
router.get('/user/:username', requirePermission('view_user_info'), async (req, res) => {
  const { username } = req.params;
  
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        badges: {
          include: {
            badge: true
          }
        },
        adminLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: { username: true }
            }
          }
        },
        targetLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: { username: true }
            }
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    const { password, ...userInfo } = user;
    
    res.json(userInfo);
    
  } catch (error) {
    console.error('Erreur get user:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Statistiques globales
 * GET /api/admin/stats
 */
router.get('/stats', requirePermission('view_stats'), async (req, res) => {
  try {
    const [totalUsers, bannedUsers, totalBadges, totalLogs] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.badge.count(),
      prisma.adminLog.count()
    ]);
    
    const stats = {
      totalUsers,
      bannedUsers,
      mutedUsers: await prisma.user.count({ where: { isMuted: true } }),
      totalBadges,
      totalLogs,
      totalRooms: await prisma.room.count(),
      publicRooms: await prisma.room.count({ where: { isPublic: true } })
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Logs admin
 * GET /api/admin/logs
 */
router.get('/logs', requirePermission('view_all_logs'), async (req, res) => {
  const { action, limit = 100, offset = 0 } = req.query;
  
  try {
    const where: any = {};
    if (action) {
      where.action = action;
    }
    
    const logs = await prisma.adminLog.findMany({
      where,
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { username: true, role: true }
        },
        targetUser: {
          select: { username: true }
        }
      }
    });
    
    res.json(logs);
    
  } catch (error) {
    console.error('Erreur logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
