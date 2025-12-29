import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/messages/conversations
 * Récupérer toutes les conversations de l'utilisateur
 */
router.get('/conversations', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Récupérer tous les messages où l'utilisateur est impliqué
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Grouper par conversation (autre utilisateur)
    const conversationsMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      
      if (!conversationsMap.has(otherUserId)) {
        const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
        
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          username: otherUser.username,
          avatar: otherUser.avatar,
          lastMessage: msg,
          unreadCount: 0
        });
      }

      // Compter les non lus
      if (msg.receiverId === userId && !msg.read) {
        const conv = conversationsMap.get(otherUserId);
        conv.unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values());
    
    res.json(conversations);
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/messages/:otherUserId
 * Récupérer les messages avec un utilisateur spécifique
 */
router.get('/:otherUserId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { otherUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Marquer comme lus
    await prisma.privateMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false
      },
      data: {
        read: true
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/messages/send
 * Envoyer un message privé
 */
router.post('/send', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { receiverId, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message vide' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Message trop long (max 500 caractères)' });
    }

    if (receiverId === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un message' });
    }

    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Créer le message
    const message = await prisma.privateMessage.create({
      data: {
        senderId: userId,
        receiverId,
        content: content.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // TODO: Émettre un événement socket pour notification temps réel
    // socketService.emitToUser(receiverId, 'private_message', message);

    res.json(message);
  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/messages/unread/count
 * Compter les messages non lus
 */
router.get('/unread/count', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const count = await prisma.privateMessage.count({
      where: {
        receiverId: userId,
        read: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Erreur comptage messages non lus:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
