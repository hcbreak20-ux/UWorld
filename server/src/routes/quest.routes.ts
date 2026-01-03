import { Router, Request, Response } from 'express';
import { questService } from '../services/quest.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/quests
 * Récupérer toutes les quêtes disponibles
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // S'assurer que l'utilisateur a toutes ses quêtes assignées
    await questService.ensureUserHasQuests(userId);

    // Récupérer les quêtes de l'utilisateur
    const userQuests = await questService.getUserQuests(userId);

    // Grouper par type
    const grouped = {
      tutorial: userQuests.filter(uq => uq.quest.type === 'TUTORIAL'),
      daily: userQuests.filter(uq => uq.quest.type === 'DAILY'),
      weekly: userQuests.filter(uq => uq.quest.type === 'WEEKLY'),
      special: userQuests.filter(uq => uq.quest.type === 'SPECIAL'),
      hidden: userQuests.filter(uq => uq.quest.type === 'HIDDEN'),
    };

    res.json({
      success: true,
      quests: userQuests,
      grouped,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/quests:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des quêtes',
      error: error.message,
    });
  }
});

/**
 * GET /api/quests/progress
 * Récupérer la progression détaillée
 */
router.get('/progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userQuests = await questService.getUserQuests(userId);

    // Calculer les statistiques
    const stats = {
      total: userQuests.length,
      completed: userQuests.filter(uq => uq.completed).length,
      inProgress: userQuests.filter(uq => !uq.completed && uq.progress > 0).length,
      notStarted: userQuests.filter(uq => uq.progress === 0).length,
      rewardsToClaim: userQuests.filter(uq => uq.completed && !uq.rewardClaimed).length,
    };

    res.json({
      success: true,
      stats,
      quests: userQuests,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/quests/progress:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la progression',
      error: error.message,
    });
  }
});

/**
 * POST /api/quests/:questId/claim
 * Réclamer la récompense d'une quête
 */
router.post('/:questId/claim', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questId } = req.params;

    const reward = await questService.claimReward(userId, questId);

    res.json({
      success: true,
      message: 'Récompense réclamée avec succès!',
      reward,
    });
  } catch (error: any) {
    console.error('Erreur POST /api/quests/:questId/claim:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la réclamation de la récompense',
    });
  }
});

/**
 * POST /api/quests/track
 * Tracker manuellement une progression (pour debug)
 */
router.post('/track', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { targetType, increment = 1 } = req.body;

    if (!targetType) {
      return res.status(400).json({
        success: false,
        message: 'targetType requis',
      });
    }

    await questService.trackProgress(userId, targetType, increment);

    res.json({
      success: true,
      message: 'Progression trackée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur POST /api/quests/track:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du tracking',
      error: error.message,
    });
  }
});

/**
 * GET /api/quests/available
 * Récupérer seulement les quêtes non complétées
 */
router.get('/available', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    await questService.ensureUserHasQuests(userId);

    const userQuests = await questService.getUserQuests(userId);
    const available = userQuests.filter(uq => !uq.completed);

    res.json({
      success: true,
      quests: available,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/quests/available:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des quêtes disponibles',
      error: error.message,
    });
  }
});

/**
 * GET /api/quests/completed
 * Récupérer seulement les quêtes complétées
 */
router.get('/completed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const userQuests = await questService.getUserQuests(userId);
    const completed = userQuests.filter(uq => uq.completed);

    res.json({
      success: true,
      quests: completed,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/quests/completed:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des quêtes complétées',
      error: error.message,
    });
  }
});

export default router;
