import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/badges
 * Récupérer tous les badges disponibles
 */
router.get('/', async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: [
        { category: 'asc' },
        { rarity: 'asc' }
      ]
    });

    res.json(badges);
  } catch (error) {
    console.error('Erreur récupération badges:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/badges/user/:userId
 * Récupérer les badges débloqués d'un utilisateur
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    res.json(userBadges);
  } catch (error) {
    console.error('Erreur récupération badges utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/badges/my
 * Récupérer les badges de l'utilisateur connecté
 */
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    res.json(userBadges);
  } catch (error) {
    console.error('Erreur récupération mes badges:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/badges/unlock
 * Débloquer un badge pour un utilisateur (usage interne)
 */
router.post('/unlock', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { badgeKey } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Trouver le badge
    const badge = await prisma.badge.findUnique({
      where: { key: badgeKey }
    });

    if (!badge) {
      return res.status(404).json({ error: 'Badge non trouvé' });
    }

    // Vérifier si déjà débloqué
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Badge déjà débloqué', alreadyUnlocked: true });
    }

    // Débloquer le badge
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id
      },
      include: {
        badge: true
      }
    });

    res.json({
      message: 'Badge débloqué!',
      userBadge,
      newlyUnlocked: true
    });
  } catch (error) {
    console.error('Erreur déblocage badge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/badges/stats
 * Statistiques globales des badges
 */
router.get('/stats', async (req, res) => {
  try {
    const totalBadges = await prisma.badge.count();
    const totalUnlocks = await prisma.userBadge.count();

    // Badges les plus débloqués
    const mostUnlocked = await prisma.userBadge.groupBy({
      by: ['badgeId'],
      _count: {
        badgeId: true
      },
      orderBy: {
        _count: {
          badgeId: 'desc'
        }
      },
      take: 5
    });

    // Récupérer les détails des badges les plus débloqués
    const badgeIds = mostUnlocked.map(b => b.badgeId);
    const badges = await prisma.badge.findMany({
      where: { id: { in: badgeIds } }
    });

    const mostUnlockedWithDetails = mostUnlocked.map(stat => {
      const badge = badges.find(b => b.id === stat.badgeId);
      return {
        badge,
        unlockCount: stat._count.badgeId
      };
    });

    res.json({
      totalBadges,
      totalUnlocks,
      mostUnlocked: mostUnlockedWithDetails
    });
  } catch (error) {
    console.error('Erreur stats badges:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
