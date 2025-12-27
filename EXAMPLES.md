# 🎓 Guide d'Extension du Projet

Ce guide contient des exemples pratiques pour ajouter de nouvelles fonctionnalités à Virtual World.

## 📝 Table des Matières

1. [Ajouter un nouveau endpoint API](#ajouter-un-nouveau-endpoint-api)
2. [Créer un nouvel événement Socket.IO](#créer-un-nouvel-événement-socketio)
3. [Ajouter un nouveau composant React](#ajouter-un-nouveau-composant-react)
4. [Étendre le modèle de données](#étendre-le-modèle-de-données)
5. [Créer un mini-jeu Phaser](#créer-un-mini-jeu-phaser)

---

## Ajouter un Nouveau Endpoint API

### Exemple: Système d'Amis

#### 1. Ajouter au schéma Prisma

```prisma
// prisma/schema.prisma

model Friendship {
  id          String   @id @default(uuid())
  userId      String
  friendId    String
  status      String   @default("pending") // pending, accepted, rejected
  createdAt   DateTime @default(now())
  
  user        User     @relation("UserFriendships", fields: [userId], references: [id])
  friend      User     @relation("FriendOf", fields: [friendId], references: [id])
  
  @@unique([userId, friendId])
  @@index([userId])
  @@index([friendId])
}

// Dans le modèle User, ajouter:
model User {
  // ... autres champs
  friendships     Friendship[] @relation("UserFriendships")
  friendOf        Friendship[] @relation("FriendOf")
}
```

#### 2. Créer le service

```typescript
// server/src/services/friend.service.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FriendService {
  static async sendFriendRequest(userId: string, friendId: string) {
    // Vérifier que l'ami existe
    const friend = await prisma.user.findUnique({ where: { id: friendId } });
    if (!friend) throw new Error('Utilisateur non trouvé');
    
    // Créer la demande
    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: 'pending',
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
    
    return friendship;
  }
  
  static async acceptFriendRequest(friendshipId: string, userId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    
    if (!friendship || friendship.friendId !== userId) {
      throw new Error('Demande non trouvée');
    }
    
    return await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
    });
  }
  
  static async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true,
          },
        },
      },
    });
    
    // Retourner la liste des amis (pas l'utilisateur lui-même)
    return friendships.map(f => 
      f.userId === userId ? f.friend : f.user
    );
  }
}
```

#### 3. Créer les routes

```typescript
// server/src/routes/friend.routes.ts

import express, { Response } from 'express';
import { FriendService } from '../services/friend.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);

// POST /api/friends/request
router.post('/request', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    
    const { friendId } = req.body;
    const friendship = await FriendService.sendFriendRequest(req.user.userId, friendId);
    res.status(201).json(friendship);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/friends/accept/:id
router.put('/accept/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    
    const friendship = await FriendService.acceptFriendRequest(req.params.id, req.user.userId);
    res.json(friendship);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/friends
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    
    const friends = await FriendService.getFriends(req.user.userId);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
```

#### 4. Enregistrer les routes

```typescript
// server/src/index.ts

import friendRoutes from './routes/friend.routes';

// ... après les autres routes
app.use('/api/friends', friendRoutes);
```

---

## Créer un Nouvel Événement Socket.IO

### Exemple: Émotes/Animations

#### Côté Serveur

```typescript
// server/src/socket/index.ts

// Dans io.on('connection', ...)

socket.on('emote', (data: { emoteType: string }) => {
  if (!socket.currentRoom || !socket.userId) return;
  
  const validEmotes = ['wave', 'dance', 'jump', 'laugh'];
  if (!validEmotes.includes(data.emoteType)) return;
  
  // Diffuser l'émote aux autres joueurs
  socket.to(socket.currentRoom).emit('player_emote', {
    userId: socket.userId,
    emoteType: data.emoteType,
  });
});
```

#### Côté Client (Service)

```typescript
// client/src/services/socket.ts

// Ajouter dans la classe SocketService

sendEmote(emoteType: string) {
  if (!this.socket) return;
  this.socket.emit('emote', { emoteType });
}

onPlayerEmote(callback: (data: { userId: string; emoteType: string }) => void) {
  if (!this.socket) return;
  this.socket.on('player_emote', callback);
}
```

#### Côté Client (Phaser Scene)

```typescript
// client/src/phaser/scenes/LobbyScene.ts

// Dans setupSocketEvents()

socketService.onPlayerEmote((data) => {
  const sprite = this.players.get(data.userId);
  if (sprite) {
    this.playEmoteAnimation(sprite, data.emoteType);
  }
});

// Nouvelle méthode
private playEmoteAnimation(sprite: Phaser.GameObjects.Sprite, emoteType: string) {
  switch (emoteType) {
    case 'wave':
      this.tweens.add({
        targets: sprite,
        angle: { from: -10, to: 10 },
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
      break;
    case 'jump':
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 20,
        duration: 300,
        yoyo: true,
      });
      break;
    // ... autres émotes
  }
}
```

---

## Ajouter un Nouveau Composant React

### Exemple: Panel d'Inventaire

```typescript
// client/src/components/Inventory.tsx

import React from 'react';
import { useStore } from '@/store';
import './Inventory.css';

interface Item {
  id: string;
  name: string;
  type: 'furniture' | 'clothing' | 'consumable';
  icon: string;
  quantity: number;
}

export const Inventory: React.FC = () => {
  const { user } = useStore();
  const [items, setItems] = React.useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  
  // Charger l'inventaire (à implémenter côté API)
  React.useEffect(() => {
    // Exemple statique pour le moment
    setItems([
      { id: '1', name: 'Chaise Rouge', type: 'furniture', icon: '🪑', quantity: 3 },
      { id: '2', name: 'Table', type: 'furniture', icon: '🪟', quantity: 1 },
    ]);
  }, []);
  
  const handleUseItem = (item: Item) => {
    console.log('Utiliser:', item);
    // Logique d'utilisation
  };
  
  return (
    <div className="inventory">
      <div className="inventory-header">
        <h3>🎒 Inventaire</h3>
        <span className="item-count">{items.length} objets</span>
      </div>
      
      <div className="inventory-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className={`inventory-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
            onClick={() => setSelectedItem(item)}
          >
            <span className="item-icon">{item.icon}</span>
            <span className="item-name">{item.name}</span>
            {item.quantity > 1 && (
              <span className="item-quantity">x{item.quantity}</span>
            )}
          </div>
        ))}
      </div>
      
      {selectedItem && (
        <div className="inventory-actions">
          <button onClick={() => handleUseItem(selectedItem)}>
            Utiliser
          </button>
          <button>Vendre</button>
          <button>Jeter</button>
        </div>
      )}
    </div>
  );
};
```

```css
/* client/src/components/Inventory.css */

.inventory {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 15px;
  height: 100%;
}

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.inventory-header h3 {
  color: white;
  margin: 0;
}

.item-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.inventory-item {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.inventory-item:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.inventory-item.selected {
  background: rgba(102, 126, 234, 0.3);
  border-color: #667eea;
}

.item-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 5px;
}

.item-name {
  color: white;
  font-size: 0.75rem;
  display: block;
}

.item-quantity {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #667eea;
  color: white;
  font-size: 0.7rem;
  padding: 2px 5px;
  border-radius: 10px;
}

.inventory-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.inventory-actions button {
  flex: 1;
  padding: 8px;
  background: rgba(102, 126, 234, 0.5);
  color: white;
  border: 1px solid #667eea;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.inventory-actions button:hover {
  background: rgba(102, 126, 234, 0.7);
}
```

---

## Étendre le Modèle de Données

### Exemple: Système d'Items/Meubles

```prisma
// prisma/schema.prisma

model FurnitureItem {
  id          String   @id @default(uuid())
  name        String
  description String
  category    String   // chair, table, decoration, etc.
  sprite      String   // Nom du sprite Phaser
  width       Int      // Largeur en tiles
  height      Int      // Hauteur en tiles
  price       Int      // Prix en pièces
  gemPrice    Int      @default(0)
  rarity      String   @default("common") // common, rare, epic, legendary
  
  createdAt   DateTime @default(now())
  
  inventories UserInventory[]
}

model UserInventory {
  id            String   @id @default(uuid())
  userId        String
  furnitureId   String
  quantity      Int      @default(1)
  acquiredAt    DateTime @default(now())
  
  user          User          @relation(fields: [userId], references: [id])
  furniture     FurnitureItem @relation(fields: [furnitureId], references: [id])
  
  @@unique([userId, furnitureId])
  @@index([userId])
}

// Ajouter dans User
model User {
  // ... autres champs
  inventory  UserInventory[]
}
```

### Seed Initial Data

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Créer des meubles de base
  const furniture = await prisma.furnitureItem.createMany({
    data: [
      {
        name: 'Chaise Rouge',
        description: 'Une chaise confortable rouge',
        category: 'seating',
        sprite: 'chair_red',
        width: 1,
        height: 1,
        price: 50,
        rarity: 'common',
      },
      {
        name: 'Table en Bois',
        description: 'Une grande table en bois',
        category: 'table',
        sprite: 'table_wood',
        width: 2,
        height: 2,
        price: 150,
        rarity: 'common',
      },
      {
        name: 'Télévision HD',
        description: 'Écran plat haute définition',
        category: 'electronics',
        sprite: 'tv_hd',
        width: 2,
        height: 1,
        price: 500,
        gemPrice: 10,
        rarity: 'rare',
      },
    ],
  });
  
  console.log('Meubles créés:', furniture.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
# Exécuter le seed
npx ts-node prisma/seed.ts
```

---

## Créer un Mini-Jeu Phaser

### Exemple: Jeu de Dés Simple

```typescript
// client/src/phaser/scenes/DiceGameScene.ts

import Phaser from 'phaser';

export class DiceGameScene extends Phaser.Scene {
  private bet: number = 0;
  private diceSprite!: Phaser.GameObjects.Sprite;
  private resultText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'DiceGameScene' });
  }
  
  create() {
    // Fond
    this.add.rectangle(400, 300, 800, 600, 0x2d3748);
    
    // Titre
    this.add.text(400, 50, '🎲 Jeu de Dés', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    // Dé
    this.diceSprite = this.add.sprite(400, 250, 'dice_1');
    this.diceSprite.setScale(2);
    
    // Texte résultat
    this.resultText = this.add.text(400, 400, '', {
      fontSize: '24px',
      color: '#FFD700',
    }).setOrigin(0.5);
    
    // Bouton lancer
    const rollButton = this.add.rectangle(400, 500, 200, 50, 0x667eea);
    const rollText = this.add.text(400, 500, 'Lancer (10 pièces)', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    rollButton.setInteractive({ useHandCursor: true });
    rollButton.on('pointerdown', () => this.rollDice());
    
    // Bouton retour
    const backButton = this.add.text(50, 50, '← Retour', {
      fontSize: '20px',
      color: '#ffffff',
    });
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.scene.start('LobbyScene'));
  }
  
  private rollDice() {
    this.bet = 10;
    
    // Animation de roulement
    this.tweens.add({
      targets: this.diceSprite,
      angle: 720,
      duration: 1000,
      ease: 'Cubic.out',
      onComplete: () => {
        // Résultat aléatoire
        const result = Phaser.Math.Between(1, 6);
        this.diceSprite.setTexture(`dice_${result}`);
        this.diceSprite.setAngle(0);
        
        // Calculer gain
        if (result === 6) {
          const winAmount = this.bet * 5;
          this.resultText.setText(`🎉 Jackpot! +${winAmount} pièces!`);
          this.addCoins(winAmount);
        } else if (result >= 4) {
          const winAmount = this.bet * 2;
          this.resultText.setText(`✨ Gagné! +${winAmount} pièces!`);
          this.addCoins(winAmount);
        } else {
          this.resultText.setText(`😔 Perdu... -${this.bet} pièces`);
          this.removeCoins(this.bet);
        }
      },
    });
  }
  
  private addCoins(amount: number) {
    // Appeler l'API pour ajouter des pièces
    // TODO: Implémenter l'endpoint /api/user/coins
  }
  
  private removeCoins(amount: number) {
    // Appeler l'API pour retirer des pièces
  }
}
```

---

Ces exemples te donnent une base solide pour étendre le projet. N'hésite pas à les adapter selon tes besoins!
