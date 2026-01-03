import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { levelService } from '../services/level.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * PUT /api/users/motto
 * Mettre à jour le motto de l'utilisateur
 */
router.put('/motto', authMiddleware, async (req: AuthRequest, res) => {
 try {
 const userId = req.user?.userId;
 const { motto } = req.body;

 if (!userId) {
 return res.status(401).json({ error: 'Non authentifié' });
 }

 if (!motto || typeof motto !== 'string') {
 return res.status(400).json({ error: 'Motto invalide' });
 }

 // Limiter la longueur du motto
 if (motto.length > 100) {
 return res.status(400).json({ error: 'Motto trop long (max 100 caractères)' });
 }

 const updatedUser = await prisma.user.update({
 where: { id: userId },
 data: { motto },
 select: {
 id: true,
 user
 level: true,
 experience: true,
 coins: true,
 gems: true
 createdAt: true
 }
 });

 res.json(updatedUser);
 } catch (error) {
 console.error('Erreur mise à jour
 res.status(500).json({ error: 'Erreur serveur' });
 }
});

/**
 * PUT /api/users/active-badge
 * Changer le badge actif de l'utilisateur
 */
router.put('/active-badge', authMiddleware, async (req: AuthRequest, res) => {
 try {
 const userId = req.user?.userId;
 const { activeBadgeId } = req.body;

 if (!userId) {
 return res.status(401).json({ error: 'Non authentifié' });
 }

 // Vérifier que l'utilisateur possède ce badge (si activeBadgeId n'est pas null)
 if (activeBadgeId) {
 const userBadge = await prisma.userBadge.findUnique({
 where: {
 userId_badgeId: {
 userId,
 badgeId: activeBadgeId
 }
 }
 });

 if (!userBadge) {
 return res.status(403).json({ error: 'Vous ne possédez pas ce badge' });
 }
 }

 const updatedUser = await prisma.user.update({
 where: { id: userId },
 data: {
 select: {
 id: true,
 user
 level: true,
 experience: true,
 coins: true,
 gems: true
 createdAt: true
 }
 });

 res.json(updatedUser);
 } catch (error) {
 console.error('Erreur changement badge actif:', error);
 res.status(500).json({ error: 'Erreur serveur' });
 }
});

/**
 * GET /api/users/profile/:userId
 * Récupérer le profil public d'un utilisateur
 */
router.get('/profile/:userId', async (req, res) => {
 try {
 const { userId } = req.params;

 const user = await prisma.user.findUnique({
 where: { id: userId },
 select: {
 id: true,
 user
 level: true,
 experience: true,
 coins: true,
 gems: true
 activeBadge: {
 select: {
 id: true
 icon: true
 }
 },
 badges: {
 include: {
 badge: true
 },
 orderBy: {
 }
 },
 createdAt: true
 }
 });

 if (!user) {
 return res.status(404).json({ error: 'Utilisateur non trouvé' });
 }

 // ✅ Utiliser le vrai levelService pour calculer le niveau
 const levelProgress = levelService.getCurrentLevelProgress(user.experience);

 res.json({
 ...user,
 level: levelProgress.currentLevel // Niveau calculé avec la VRAIE formule
 });
 } catch (error) {
 console.error('Erreur récupération profil:', error);
 res.status(500).json({ error: 'Erreur serveur' });
 }
});

export default router;
