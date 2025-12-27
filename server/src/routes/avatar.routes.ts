import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Interface pour la configuration d'avatar
interface AvatarConfig {
  gender: 'male' | 'female';
  headType: number; // 1-5
  hairStyle: number; // 1-8
  clothingStyle: number; // 1-5
  skinColor: string;
  hairColor: string;
  clothingColor: string;
  pantsColor: string;
}

// GET /api/avatar - Obtenir l'avatar actuel
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { avatar: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ avatar: user.avatar });
  } catch (error) {
    console.error('Erreur get avatar:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/avatar - Mettre à jour l'avatar
router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const avatarConfig: AvatarConfig = req.body;

    // Validation basique
    if (!avatarConfig.gender || !['male', 'female'].includes(avatarConfig.gender)) {
      return res.status(400).json({ message: 'Genre invalide' });
    }

    if (avatarConfig.headType < 1 || avatarConfig.headType > 5) {
      return res.status(400).json({ message: 'Type de tête invalide' });
    }

    if (avatarConfig.hairStyle < 1 || avatarConfig.hairStyle > 8) {
      return res.status(400).json({ message: 'Style de cheveux invalide' });
    }

    if (avatarConfig.clothingStyle < 1 || avatarConfig.clothingStyle > 5) {
      return res.status(400).json({ message: 'Style de vêtements invalide' });
    }

    // Mettre à jour dans la base de données
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatar: avatarConfig as any },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    res.json({
      message: 'Avatar mis à jour avec succès',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Erreur update avatar:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/avatar/options - Obtenir toutes les options disponibles
router.get('/options', (req, res) => {
  res.json({
    genders: ['male', 'female'],
    headTypes: [1, 2, 3, 4, 5],
    headNames: ['Rond', 'Carré', 'Ovale', 'Sourire', 'Cool'],
    hairStyles: [1, 2, 3, 4, 5, 6, 7, 8],
    hairNames: ['Court', 'Long', 'Spike', 'Afro', 'Queue', 'Mohawk', 'Bouclé', 'Chauve'],
    clothingStyles: [1, 2, 3, 4, 5],
    clothingNames: ['T-shirt', 'Hoodie', 'Robe/Costume', 'Veste', 'Pull'],
    skinColors: ['light', 'medium', 'tan', 'dark'],
    hairColors: ['blonde', 'brown', 'black', 'red', 'blue', 'pink', 'green', 'white'],
    clothingColors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white'],
  });
});

export default router;
