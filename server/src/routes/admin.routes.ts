import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
// ✅ NOUVEAU
import { prisma } from '../lib/prisma';

const router = Router();

// Middleware pour vérifier si l'utilisateur est admin
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Accès refusé: Administrateur requis' });
    }

    next();
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// GET /api/admin/floor-types - Obtenir tous les types de sol disponibles
router.get('/floor-types', authMiddleware, requireAdmin, (req, res) => {
  const floorTypes = [
    { id: 'wooden', name: 'Parquet en bois', category: 'classic' },
    { id: 'checkered_gray', name: 'Damier gris', category: 'classic' },
    { id: 'checkered_blue', name: 'Damier bleu', category: 'classic' },
    { id: 'checkered_green', name: 'Damier vert', category: 'classic' },
    { id: 'marble', name: 'Marbre blanc', category: 'luxury' },
    { id: 'carpet_red', name: 'Tapis rouge', category: 'carpet' },
    { id: 'carpet_blue', name: 'Tapis bleu', category: 'carpet' },
    { id: 'carpet_purple', name: 'Tapis violet', category: 'carpet' },
    { id: 'carpet_gold', name: 'Tapis doré', category: 'carpet' },
    { id: 'grass', name: 'Herbe', category: 'outdoor' },
    { id: 'water', name: 'Eau', category: 'outdoor' },
    { id: 'stone', name: 'Pierre', category: 'outdoor' },
  ];

  res.json({ floorTypes });
});

// GET /api/admin/rooms - Obtenir toutes les salles (pour administration)
router.get('/rooms', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        floor: true,
        wallpaper: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ rooms });
  } catch (error) {
    console.error('Erreur get rooms:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/admin/room/:roomId/floor - Changer le sol d'une salle
router.put('/room/:roomId/floor', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { floorType } = req.body;

    if (!floorType) {
      return res.status(400).json({ message: 'Type de sol requis' });
    }

    // Vérifier que la salle existe
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ message: 'Salle non trouvée' });
    }

    // Mettre à jour le sol
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { floor: floorType },
      select: {
        id: true,
        name: true,
        floor: true,
      },
    });

    res.json({
      message: 'Sol mis à jour avec succès',
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Erreur update floor:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/admin/room/:roomId/wallpaper - Changer le papier peint d'une salle
router.put('/room/:roomId/wallpaper', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { wallpaperType } = req.body;

    if (!wallpaperType) {
      return res.status(400).json({ message: 'Type de papier peint requis' });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { wallpaper: wallpaperType },
      select: {
        id: true,
        name: true,
        wallpaper: true,
      },
    });

    res.json({
      message: 'Papier peint mis à jour avec succès',
      room: updatedRoom,
    });
  } catch (error) {
    console.error('Erreur update wallpaper:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/admin/check - Vérifier si l'utilisateur est admin
router.get('/check', authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { isAdmin: true },
    });

    res.json({ isAdmin: user?.isAdmin || false });
  } catch (error) {
    console.error('Erreur check admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
