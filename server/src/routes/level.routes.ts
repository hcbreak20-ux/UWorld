import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { levelService } from '../services/level.service';
import { prisma } from '../lib/prisma';

const router = express.Router();

/**
 * GET /api/level/progress
 * Récupérer la progression de niveau de l'utilisateur connecté
 */
router.get('/progress', authMiddleware, async (req: AuthRequest, res) => {
 try {
 const userId = req.user?.userId;

 if (!userId) {
 return res.status(401).json({ error: 'Non authentifié' });
 }

 const user = await prisma.user.findUnique({
 where: { id: userId },
 select: {
 level: true,
 experience: true,
 },
 });

 if (!user) {
 return res.status(404).json({ error: 'Utilisateur non trouvé' });
 }

 const progress = levelService.getCurrentLevelProgress(user.experience);

 res.json({
 level: progress.currentLevel,
 currentXp: progress.currentXp,
 xpForNextLevel: progress.xpForNextLevel,
 progressPercentage: progress.progressPercentage,
 totalXp: user.experience,
 });
 } catch (error) {
 console.error('Erreur GET /api/level/progress:', error);
 res.status(500).json({ error: 'Erreur serveur' });
 }
});

export default router;