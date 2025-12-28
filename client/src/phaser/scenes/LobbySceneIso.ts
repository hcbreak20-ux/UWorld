import Phaser from 'phaser';
import { socketService } from '@/services/socket';
import { useStore } from '@/store';
import type { Player, PlayerPosition, Message } from '@/types';
import { ChatBubble, type BubbleType } from '@/phaser/objects/ChatBubble';

// Configuration isométrique
const ISO_TILE_WIDTH = 64;
const ISO_TILE_HEIGHT = 32;
const WALL_HEIGHT = 96;

export class LobbySceneIso extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerNameText!: Phaser.GameObjects.Text;
  private players: Map<string, { sprite: Phaser.GameObjects.Sprite; nameText: Phaser.GameObjects.Text }> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private currentPosition: PlayerPosition = { x: 5, y: 5, direction: 'down' };
  private isMoving = false;
  
  // Groupe pour gérer le tri en profondeur
  private gameObjects: Phaser.GameObjects.Group;

  // Système de placement de meubles
  private placedFurnitureSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private placementGhost: Phaser.GameObjects.Image | null = null;
  private placementRotation: number = 0;
  private rKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  // Système de bulles de chat
  private chatBubbles: Map<string, ChatBubble[]> = new Map(); // userId -> bulles

  constructor() {
    super({ key: 'LobbySceneIso' });
  }

  preload() {
    // Charger les tuiles de sol
    const tileTypes = [
      'wooden', 'checkered_gray', 'checkered_blue', 'checkered_green',
      'marble', 'carpet_red', 'carpet_blue', 'carpet_purple', 'carpet_gold',
      'grass', 'water', 'stone', 'grass_mod', 'brick'
    ];
    
    tileTypes.forEach(type => {
      this.load.image(`floor_${type}`, `/assets/habbo-iso/floor_${type}.png`);
    });

    // ✅ NOUVEAU: Charger le sprite 8 directions
    this.load.spritesheet('character_8dir', '/assets/habbo-iso/uworld-character-8dir.png', {
      frameWidth: 32,
      frameHeight: 48
    });

    // Charger les murs
    ['gray', 'blue', 'pink', 'green'].forEach(color => {
      this.load.image(`wall_${color}`, `/assets/habbo-iso/wall_${color}.png`);
    });

    // Charger la porte et les meubles
    this.load.image('door', '/assets/habbo-iso/door.png');
    this.load.image('furniture_chair', '/assets/habbo-iso/furniture_chair.png');
    this.load.image('furniture_table', '/assets/habbo-iso/furniture_table.png');
    this.load.image('furniture_plant', '/assets/habbo-iso/furniture_plant.png');
  }

  create() {
    const store = useStore.getState();
    
    // Créer le groupe pour les objets
    this.gameObjects = this.add.group();
    
    // ✅ NOUVEAU: Créer les animations 8 directions
    this.createCharacterAnimations();
    
    // Créer la salle isométrique
    this.createIsoRoom();
    
    // Charger les meubles placés
    this.loadPlacedFurniture();
    
    // Créer le joueur principal
    const isoPos = this.cartToIso(this.currentPosition.x, this.currentPosition.y);
    this.player = this.add.sprite(isoPos.x, isoPos.y, 'character_8dir', 0); // ✅ Utilise le nouveau sprite
    this.player.setDepth(1000);
    this.player.setData('gridX', this.currentPosition.x);
    this.player.setData('gridY', this.currentPosition.y);
    this.player.setData('color', 'blue'); // Pour compatibilité
    
    // Rendre le sprite du joueur principal cliquable pour afficher son profil
    this.player.setInteractive({ cursor: 'pointer' });
    this.player.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      this.showPlayerProfile(
        store.user?.id || '',
        store.user?.username || 'Player',
        store.user?.level || 1,
        pointer.x,
        pointer.y
      );
    }, this);
    
    // Nom du joueur (CACHÉ)
    this.playerNameText = this.add.text(isoPos.x, isoPos.y - 60, store.user?.username || 'Player', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 },
    });
    this.playerNameText.setOrigin(0.5, 1);
    this.playerNameText.setDepth(1001);
    this.playerNameText.setVisible(false);

    // Configurer la caméra
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(isoPos.x, isoPos.y);

    // Contrôles de zoom avec la molette
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
      const currentZoom = this.cameras.main.zoom;
      const zoomAmount = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(currentZoom + zoomAmount, 0.5, 2.5);
      
      this.cameras.main.setZoom(newZoom);
    });

    // Configurer les contrôles CLAVIER
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Touches pour système de meubles
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Désactiver la capture des touches pour permettre le chat
    this.input.keyboard!.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.removeCapture(Phaser.Input.Keyboard.KeyCodes.R);

    // Variable pour gérer le double-clic
    let lastClickTime = 0;
    const doubleClickDelay = 300;

    // Configurer le clic souris
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isMoving) {
        const placementMode = useStore.getState().placementMode;
        
        if (placementMode.active) {
          this.placeFurniture(pointer.worldX, pointer.worldY);
        } else {
          const currentTime = Date.now();
          const timeSinceLastClick = currentTime - lastClickTime;
          
          if (timeSinceLastClick < doubleClickDelay) {
            this.handleMouseClick(pointer.worldX, pointer.worldY);
          }
          
          lastClickTime = currentTime;
        }
      }
    });

    // Configurer les événements Socket.IO
    this.setupSocketEvents();

    // Rejoindre la salle
    const roomId = store.currentRoom?.id;
    if (roomId) {
      socketService.joinRoom(roomId, (data) => {
        console.log('Salle rejointe (ISO):', data);
        
        Object.entries(data.players).forEach(([userId, player]) => {
          if (userId !== store.user?.id) {
            this.createPlayerSprite(userId, player);
          }
        });
      });
    }
  }

  /**
   * ✅ NOUVEAU: Créer les animations pour les 8 directions
   */
  private createCharacterAnimations() {
    const directions = ['se', 's', 'sw', 'w', 'nw', 'n', 'ne', 'e'];
    
    directions.forEach((dir, index) => {
      // Animation de marche (3 frames)
      this.anims.create({
        key: `walk_${dir}`,
        frames: this.anims.generateFrameNumbers('character_8dir', {
          start: index * 3,
          end: index * 3 + 2
        }),
        frameRate: 8,
        repeat: -1
      });
      
      // Animation idle (frame 0)
      this.anims.create({
        key: `idle_${dir}`,
        frames: [{ key: 'character_8dir', frame: index * 3 }],
        frameRate: 1
      });
    });
  }

  /**
   * Gérer le clic de souris pour déplacement
   */
  private handleMouseClick(screenX: number, screenY: number) {
    const gridPos = this.screenToGrid(screenX, screenY);
    
    if (this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
      const dx = gridPos.x - this.currentPosition.x;
      const dy = gridPos.y - this.currentPosition.y;
      
      // ✅ NOUVEAU: Calculer la direction en 8 directions
      const direction = this.getDirection8(dx, dy);
      
      const newPosition = {
        x: gridPos.x,
        y: gridPos.y,
        direction: direction
      };
      
      this.movePlayer(newPosition);
    }
  }

  /**
   * Convertir coordonnées écran vers grille
   */
  private screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const offsetX = 400;
    const offsetY = 100;
    
    const relX = screenX - offsetX;
    const relY = screenY - offsetY;
    
    const gridX = Math.round((relX / (ISO_TILE_WIDTH / 2) + relY / (ISO_TILE_HEIGHT / 2)) / 2);
    const gridY = Math.round((relY / (ISO_TILE_HEIGHT / 2) - relX / (ISO_TILE_WIDTH / 2)) / 2);
    
    return { x: gridX, y: gridY };
  }

  update() {
    if (!this.player || this.isMoving) return;

    const { chatInputFocused } = useStore.getState();
    
    if (chatInputFocused) {
      return;
    }

    this.checkPlacementMode();

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      const { setPlacementMode } = useStore.getState();
      setPlacementMode(false);
      
      if (this.placementGhost) {
        this.placementGhost.destroy();
        this.placementGhost = null;
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.rKey) && this.placementGhost) {
      this.placementRotation = (this.placementRotation + 90) % 360;
      this.placementGhost.setAngle(this.placementRotation);
    }

    // ✅ MODIFIÉ: Déplacement avec les flèches en 8 directions
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown) velocityX = -1;
    if (this.cursors.right.isDown) velocityX = 1;
    if (this.cursors.up.isDown) velocityY = -1;
    if (this.cursors.down.isDown) velocityY = 1;

    if (velocityX !== 0 || velocityY !== 0) {
      // ✅ NOUVEAU: Calculer la direction en 8 directions
      const direction = this.getDirection8(velocityX, velocityY);
      
      const newPosition = {
        x: this.currentPosition.x + velocityX,
        y: this.currentPosition.y + velocityY,
        direction: direction
      };

      if (this.isValidPosition(newPosition)) {
        this.movePlayer(newPosition);
      }
    }
  }

  /**
   * ✅ NOUVEAU: Calculer la direction en 8 directions à partir d'un vecteur
   */
  private getDirection8(dx: number, dy: number): string {
    // Normaliser le vecteur
    const angle = Math.atan2(dy, dx);
    const degrees = angle * (180 / Math.PI);
    
    // Normaliser entre 0-360
    const normalized = (degrees + 360) % 360;
    
    // Diviser en 8 sections de 45°
    // 0° = Est (droite)
    // 45° = Sud-Est
    // 90° = Sud (bas)
    // 135° = Sud-Ouest
    // 180° = Ouest (gauche)
    // 225° = Nord-Ouest
    // 270° = Nord (haut)
    // 315° = Nord-Est
    
    if (normalized >= 337.5 || normalized < 22.5) return 'right';  // E
    if (normalized >= 22.5 && normalized < 67.5) return 'down';     // SE (diagonale)
    if (normalized >= 67.5 && normalized < 112.5) return 'down';    // S
    if (normalized >= 112.5 && normalized < 157.5) return 'down';   // SW (diagonale)
    if (normalized >= 157.5 && normalized < 202.5) return 'left';   // W
    if (normalized >= 202.5 && normalized < 247.5) return 'up';     // NW (diagonale)
    if (normalized >= 247.5 && normalized < 292.5) return 'up';     // N
    return 'up';  // NE (diagonale)
  }

  /**
   * ✅ MODIFIÉ: Mapper les directions 4 → 8
   */
  private getDirectionSprite(direction: string, color: string = 'blue'): string {
    // Mapper les 4 directions vers les 8 directions du sprite
    const dirMap: { [key: string]: string } = {
      'down': 's',   // Sud
      'right': 'e',  // Est
      'up': 'n',     // Nord
      'left': 'w',   // Ouest
    };
    
    const dir = dirMap[direction] || 's';
    return `walk_${dir}`; // Retourne le nom de l'animation
  }

  /**
   * ✅ MODIFIÉ: Obtenir le frame index pour une direction donnée
   */
  private getDirectionFrameIndex(direction: string): number {
    const dirMap: { [key: string]: number } = {
      'down': 3,   // S (ligne 1)
      'right': 21, // E (ligne 7)
      'up': 15,    // N (ligne 5)
      'left': 9,   // W (ligne 3)
    };
    
    return dirMap[direction] || 3;
  }

  private createIsoRoom() {
    const roomWidth = 20;
    const roomHeight = 15;
    const offsetX = 400;
    const offsetY = 100;
    
    const store = useStore.getState();
    const room = store.currentRoom;
    const floorTile = room?.floorType || 'wooden';
    
    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        const isoPos = this.cartToIso(x, y);
        const tile = this.add.image(
          isoPos.x + offsetX,
          isoPos.y + offsetY,
          `floor_${floorTile}`
        );
        tile.setOrigin(0.5, 1);
        tile.setDepth(0);
      }
    }

    const wallColor = room?.wallColor || 'gray';
    
    for (let x = 0; x < roomWidth; x++) {
      const posBack = this.cartToIso(x, 0);
      const wall = this.add.image(
        posBack.x + offsetX,
        posBack.y + offsetY,
        `wall_${wallColor}`
      );
      wall.setOrigin(0.5, 1);
      wall.setDepth(100);
    }

    for (let y = 0; y < roomHeight; y++) {
      const posLeft = this.cartToIso(0, y);
      const wall = this.add.image(
        posLeft.x + offsetX,
        posLeft.y + offsetY,
        `wall_${wallColor}`
      );
      wall.setOrigin(0.5, 1);
      wall.setDepth(100);
    }

    const doorX = Math.floor(roomWidth / 2);
    const doorPos = this.cartToIso(doorX, 0);
    const door = this.add.image(
      doorPos.x + offsetX,
      doorPos.y + offsetY,
      'door'
    );
    door.setOrigin(0.5, 1);
    door.setDepth(150);
    door.setInteractive({ cursor: 'pointer' });
    door.on('pointerdown', () => {
      socketService.leaveRoom();
      const { setCurrentRoom } = useStore.getState();
      setCurrentRoom(null);
    });
  }

  private cartToIso(x: number, y: number) {
    const offsetX = 400;
    const offsetY = 100;
    
    const isoX = (x - y) * (ISO_TILE_WIDTH / 2);
    const isoY = (x + y) * (ISO_TILE_HEIGHT / 2);
    
    return { x: isoX + offsetX, y: isoY + offsetY };
  }

  private checkPlacementMode() {
    const { placementMode } = useStore.getState();
    
    if (placementMode.active && placementMode.itemId) {
      if (!this.placementGhost) {
        this.placementGhost = this.add.image(0, 0, placementMode.itemId);
        this.placementGhost.setOrigin(0.5, 1);
        this.placementGhost.setAlpha(0.7);
        this.placementGhost.setTint(0x00ff00);
        this.placementGhost.setDepth(999);
      }
      
      const pointer = this.input.activePointer;
      const gridPos = this.screenToGrid(pointer.worldX, pointer.worldY);
      const isoPos = this.cartToIso(gridPos.x, gridPos.y);
      
      this.placementGhost.setPosition(isoPos.x, isoPos.y);
    } else if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
      this.placementRotation = 0;
    }
  }

  private placeFurniture(screenX: number, screenY: number) {
    const { placementMode, currentRoom, user, setPlacementMode } = useStore.getState();
    
    if (!placementMode.active || !placementMode.itemId || !currentRoom || !user) {
      return;
    }
    
    const gridPos = this.screenToGrid(screenX, screenY);
    
    if (!this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
      return;
    }
    
    socketService.placeFurniture({
      itemId: placementMode.itemId,
      position: { x: gridPos.x, y: gridPos.y },
      rotation: this.placementRotation,
    }, (success, furnitureId) => {
      if (success && furnitureId) {
        const isoPos = this.cartToIso(gridPos.x, gridPos.y);
        const sprite = this.add.image(isoPos.x, isoPos.y, placementMode.itemId);
        sprite.setOrigin(0.5, 1);
        sprite.setAngle(this.placementRotation);
        sprite.setDepth(500);
        sprite.setInteractive({ cursor: 'pointer' });
        
        sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.event) {
            pointer.event.stopPropagation();
          }
          this.showFurnitureMenu(furnitureId, sprite);
        });
        
        this.placedFurnitureSprites.set(furnitureId, sprite);
        
        setPlacementMode(false);
        
        if (this.placementGhost) {
          this.placementGhost.destroy();
          this.placementGhost = null;
          this.placementRotation = 0;
        }
      }
    });
  }

  private loadPlacedFurniture() {
    socketService.getPlacedFurniture((furniture) => {
      furniture.forEach((item) => {
        const isoPos = this.cartToIso(item.position.x, item.position.y);
        const sprite = this.add.image(isoPos.x, isoPos.y, item.itemId);
        sprite.setOrigin(0.5, 1);
        sprite.setAngle(item.rotation);
        sprite.setDepth(500);
        sprite.setInteractive({ cursor: 'pointer' });
        
        sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.event) {
            pointer.event.stopPropagation();
          }
          this.showFurnitureMenu(item.id, sprite);
        });
        
        this.placedFurnitureSprites.set(item.id, sprite);
      });
    });
  }

  private showFurnitureMenu(furnitureId: string, sprite: Phaser.GameObjects.Image) {
    const store = useStore.getState();
    
    const confirmDelete = confirm('Voulez-vous supprimer ce meuble?');
    if (confirmDelete) {
      socketService.removeFurniture(furnitureId, (success) => {
        if (success) {
          sprite.destroy();
          this.placedFurnitureSprites.delete(furnitureId);
        }
      });
    }
  }

  private showPlayerProfile(
    userId: string,
    username: string,
    level: number,
    x: number,
    y: number
  ) {
    const store = useStore.getState();
    store.setSelectedPlayer({ userId, username, level });
  }

  private createPlayerSprite(userId: string, player: Player) {
    const isoPos = this.cartToIso(player.position.x, player.position.y);
    
    // ✅ Utilise le nouveau sprite
    const sprite = this.add.sprite(isoPos.x, isoPos.y, 'character_8dir', 0);
    sprite.setDepth(1000);
    sprite.setData('gridX', player.position.x);
    sprite.setData('gridY', player.position.y);
    sprite.setData('color', 'green'); // Pour différencier des autres joueurs
    
    sprite.setInteractive({ cursor: 'pointer' });
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      this.showPlayerProfile(userId, player.username, player.avatar?.level || 1, pointer.x, pointer.y);
    }, this);
    
    const nameText = this.add.text(isoPos.x, isoPos.y - 60, player.username, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 },
    });
    nameText.setOrigin(0.5, 1);
    nameText.setDepth(1001);
    nameText.setVisible(false);
    
    this.players.set(userId, { sprite, nameText });
  }

  private movePlayer(newPosition: PlayerPosition) {
    this.isMoving = true;
    this.currentPosition = newPosition;

    const isoPos = this.cartToIso(newPosition.x, newPosition.y);
    const newDepth = 1000;
    
    // ✅ MODIFIÉ: Jouer l'animation correspondante
    const animKey = this.getDirectionSprite(newPosition.direction);
    this.player.play(animKey);

    this.tweens.add({
      targets: this.player,
      x: isoPos.x,
      y: isoPos.y,
      duration: 200,
      ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.player.setData('gridX', newPosition.x);
        this.player.setData('gridY', newPosition.y);
        // Arrêter l'animation et afficher idle
        this.player.stop();
        const idleFrame = this.getDirectionFrameIndex(newPosition.direction);
        this.player.setFrame(idleFrame);
      },
    });

    this.tweens.add({
      targets: this.playerNameText,
      x: isoPos.x,
      y: isoPos.y - 60,
      duration: 200,
      ease: 'Linear',
    });

    this.cameras.main.pan(isoPos.x, isoPos.y, 200, 'Linear');

    socketService.move(newPosition);
  }

  private isValidPosition(position: PlayerPosition): boolean {
    return position.x >= 0 && position.x < 20 && position.y >= 0 && position.y < 15;
  }

  private setupSocketEvents() {
    const store = useStore.getState();

    socketService.onPlayerJoined((data) => {
      if (data.userId !== store.user?.id) {
        this.createPlayerSprite(data.userId, {
          userId: data.userId,
          username: data.username,
          position: data.position,
          avatar: data.avatar,
        });
      }
    });

    socketService.onPlayerLeft((data) => {
      const playerData = this.players.get(data.userId);
      if (playerData) {
        playerData.nameText.destroy();
        playerData.sprite.destroy();
        this.players.delete(data.userId);
      }
    });

    socketService.onPlayerMoved((data) => {
      const playerData = this.players.get(data.userId);
      if (playerData) {
        const { sprite, nameText } = playerData;
        const isoPos = this.cartToIso(data.position.x, data.position.y);
        
        // ✅ MODIFIÉ: Jouer l'animation
        const animKey = this.getDirectionSprite(data.position.direction);
        sprite.play(animKey);
        
        this.tweens.add({
          targets: sprite,
          x: isoPos.x,
          y: isoPos.y,
          duration: 200,
          ease: 'Linear',
          onComplete: () => {
            sprite.stop();
            const idleFrame = this.getDirectionFrameIndex(data.position.direction);
            sprite.setFrame(idleFrame);
          },
        });

        this.tweens.add({
          targets: nameText,
          x: isoPos.x,
          y: isoPos.y - 60,
          duration: 200,
          ease: 'Linear',
        });
        
        sprite.setData('gridX', data.position.x);
        sprite.setData('gridY', data.position.y);
      }
    });

    socketService.onChatMessage((message: any) => {
      const bubbleType: BubbleType = message.type || 'normal';
      const whisperTarget = message.whisperTarget;
      
      console.log('Message reçu (bulle):', message);
      console.log('Type de bulle:', bubbleType);
      
      const currentUserId = store.user?.id;
      
      if (message.user.id === currentUserId) {
        this.showChatBubble(
          this.player,
          message.user.id,
          message.user.username,
          message.content,
          bubbleType,
          whisperTarget
        );
      } else {
        const playerData = this.players.get(message.user.id);
        if (playerData) {
          this.showChatBubble(
            playerData.sprite,
            message.user.id,
            message.user.username,
            message.content,
            bubbleType,
            whisperTarget
          );
        }
      }
    });
  }

  shutdown() {
    this.players.forEach(({ sprite, nameText }) => {
      nameText.destroy();
      sprite.destroy();
    });
    this.players.clear();
    
    if (socketService.socket) {
      socketService.socket.off('player_joined');
      socketService.socket.off('player_left');
      socketService.socket.off('player_moved');
      socketService.socket.off('chat_message');
    }
  }

  private showChatBubble(
    sprite: Phaser.GameObjects.Sprite,
    userId: string,
    username: string,
    message: string,
    bubbleType: BubbleType = 'normal',
    whisperTarget?: string
  ) {
    const store = useStore.getState();
    const currentUserId = store.user?.id;
    
    const speakerX = sprite.getData('gridX') || 0;
    const speakerY = sprite.getData('gridY') || 0;
    const viewerX = this.player.getData('gridX') || 0;
    const viewerY = this.player.getData('gridY') || 0;

    if (!this.chatBubbles.has(userId)) {
      this.chatBubbles.set(userId, []);
    }
    
    const userBubbles = this.chatBubbles.get(userId)!;
    
    const bubbleY = sprite.y - 60;

    const bubble = new ChatBubble(
      this,
      sprite.x,
      bubbleY,
      username,
      message,
      bubbleType
    );

    const shouldShow = bubble.shouldBeVisibleFor(
      viewerX,
      viewerY,
      speakerX,
      speakerY,
      currentUserId || '',
      whisperTarget
    );

    if (!shouldShow) {
      bubble.destroy();
      return;
    }

    userBubbles.forEach((existingBubble) => {
      this.tweens.add({
        targets: existingBubble,
        y: existingBubble.y - 60,
        duration: 200,
        ease: 'Power2'
      });
    });

    userBubbles.push(bubble);

    if (userBubbles.length > 5) {
      const oldBubble = userBubbles.shift();
      oldBubble?.destroy();
    }

    this.time.delayedCall(30000, () => {
      const index = userBubbles.indexOf(bubble);
      if (index > -1) {
        userBubbles.splice(index, 1);
      }
    });
  }
}
