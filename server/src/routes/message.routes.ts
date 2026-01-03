import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ✅ NOUVEAU: Fonction pour émettre notification via Socket.IO
let io: any = null;

export const setSocketIO = (socketIO: any) => {
  io = socketIO;
};

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

    // ✅ CORRIGÉ: fromId et toId au lieu de senderId et receiverId
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { fromId: parseInt(userId) },
          { toId: parseInt(userId) }
        ]
      },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        to: {
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
      const otherUserId = msg.fromId === parseInt(userId) ? msg.toId : msg.fromId;
      
      if (!conversationsMap.has(otherUserId)) {
        const otherUser = msg.fromId === parseInt(userId) ? msg.to : msg.from;
        
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          username: otherUser.username,
          avatar: otherUser.avatar,
          lastMessage: msg,
          unreadCount: 0
        });
      }

      // ✅ CORRIGÉ: isRead au lieu de read
      if (msg.toId === parseInt(userId) && !msg.isRead) {
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
          { fromId: parseInt(userId), toId: parseInt(otherUserId) },
          { fromId: parseInt(otherUserId), toId: parseInt(userId) }
        ]
      },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        to: {
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

    // ✅ CORRIGÉ: isRead au lieu de read
    await prisma.privateMessage.updateMany({
      where: {
        fromId: parseInt(otherUserId),
        toId: parseInt(userId),
        isRead: false
      },
      data: {
        isRead: true
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

    if (parseInt(receiverId) === parseInt(userId)) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un message' });
    }

    // Vérifier que le destinataire existe
    const receiver = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // ✅ CORRIGÉ: fromId et toId
    const message = await prisma.privateMessage.create({
      data: {
        fromId: parseInt(userId),
        toId: parseInt(receiverId),
        content: content.trim()
      },
      include: {
        from: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        to: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // ✅ Émettre notification Socket.IO au destinataire
    if (io) {
      const sockets = await io.fetchSockets();
      const receiverSocket = sockets.find((s: any) => s.userId === receiverId);
      
      if (receiverSocket) {
        receiverSocket.emit('private_message_notification', {
          messageId: message.id,
          from: message.from,
          content: message.content,
          createdAt: message.createdAt
        });
        console.log(`📬 Notification envoyée à ${receiver.username}`);
      }
    }

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

    // ✅ CORRIGÉ: toId et isRead
    const count = await prisma.privateMessage.count({
      where: {
        toId: parseInt(userId),
        isRead: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Erreur comptage messages non lus:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;