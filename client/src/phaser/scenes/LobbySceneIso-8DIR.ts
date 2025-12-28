import Phaser from 'phaser';
import { socketService } from '@/services/socket';
import { useStore } from '@/store';
import type { Player, PlayerPosition, Message } from '@/types';
import { ChatBubble, type BubbleType } from '@/phaser/objects/ChatBubble';

// Configuration isométrique
const ISO_TILE_WIDTH = 64;
const ISO_TILE_HEIGHT = 32;
const WALL_HEIGHT = 96;

// ✅ NOUVEAU: Interface pour position 8 directions
interface Position8Dir {
  x: number;
  y: number;
  direction: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7'; // 8 directions numérotées
}

export class LobbySceneIso extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerNameText!: Phaser.GameObjects.Text;
  private players: Map<string, { sprite: Phaser.GameObjects.Sprite; nameText: Phaser.GameObjects.Text }> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private currentPosition: PlayerPosition = { x: 5, y: 5, direction: 'down' };
  private isMoving = false;
  
  // ✅ NOUVEAU: Position avec 8 directions
  private currentDir8: string = '1'; // Direction initiale (S)
  
  // Groupe pour gérer le tri en profondeur
  private gameObjects: Phaser.GameObjects.Group;

  // Système de placement de meubles
  private placedFurnitureSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private placementGhost: Phaser.GameObjects.Image | null = null;
  private placementRotation: number = 0;
  private rKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  // Système de bulles de chat
  private chatBubbles: Map<string, ChatBubble[]> = new Map();

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
      this.load.image(`floor_${type}`, `/assets/habbo-tiles/floor_${type}.png`);
    });

    // ✅ NOUVEAU: Charger le personnage 8 directions
    this.load.spritesheet('character_8dir', '/assets/habbo-iso/character_8dir.png', {
      frameWidth: 32,
      frameHeight: 48
    });

    // ✅ GARDÉ: Charger aussi les anciens pour compatibilité (temporaire)
    const directions = ['se', 'sw', 'ne', 'nw'];
    const colors = ['blue', 'green', 'red', 'yellow'];
    
    directions.forEach(dir => {
      colors.forEach(color => {
        this.load.image(
          `char_${color}_${dir}`,
          `/assets/habbo-iso/character_${color}_${dir}.png`
        );
      });
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
    
    // Créer la salle isométrique
    this.createIsoRoom();
    
    // Charger les meubles placés
    this.loadPlacedFurniture();
    
    // ✅ NOUVEAU: Créer les animations 8 directions
    this.createAnimations8Dir();
    
    // Créer le joueur principal
    const isoPos = this.cartToIso(this.currentPosition.x, this.currentPosition.y);
    
    // ✅ NOUVEAU: Utiliser le sprite 8 directions
    this.player = this.add.sprite(isoPos.x, isoPos.y, 'character_8dir');
    this.player.setDepth(1000);
    this.player.setData('gridX', this.currentPosition.x);
    this.player.setData('gridY', this.currentPosition.y);
    
    // ✅ NOUVEAU: Jouer l'animation idle initiale
    this.player.play('idle_1'); // Direction 1 = Sud
    
    // Rendre le sprite du joueur principal cliquable
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
        console.log('Salle rejointe (ISO 8DIR):', data);
        
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
  private createAnimations8Dir(): void {
    const dirNames = ['0', '1', '2', '3', '4', '5', '6', '7'];
    
    dirNames.forEach((dir, index) => {
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
      
      // Animation idle (frame statique)
      this.anims.create({
        key: `idle_${dir}`,
        frames: [{ key: 'character_8dir', frame: index * 3 }],
        frameRate: 1
      });
    });
    
    console.log('✅ Animations 8 directions créées!');
  }

  /**
   * ✅ NOUVEAU: Calculer la direction 8 à partir de la vélocité
   */
  private getDirection8FromVelocity(vx: number, vy: number): string {
    if (vx === 0 && vy === 0) return this.currentDir8;
    
    // Calculer l'angle en radians
    const angle = Math.atan2(vy, vx);
    
    // Convertir en degrés
    let degrees = angle * (180 / Math.PI);
    
    // Normaliser entre 0-360
    if (degrees < 0) degrees += 360;
    
    // Mapping des angles vers directions (8 sections de 45°)
    // Direction 0 = SE (45°-90°)
    // Direction 1 = S (90°-135°)
    // Direction 2 = SW (135°-180°)
    // Direction 3 = W (180°-225°)
    // Direction 4 = NW (225°-270°)
    // Direction 5 = N (270°-315°)
    // Direction 6 = NE (315°-360° et 0°-45°)
    // Direction 7 = E (0°-45°)
    
    if (degrees >= 22.5 && degrees < 67.5) return '0';   // SE
    if (degrees >= 67.5 && degrees < 112.5) return '1';  // S
    if (degrees >= 112.5 && degrees < 157.5) return '2'; // SW
    if (degrees >= 157.5 && degrees < 202.5) return '3'; // W
    if (degrees >= 202.5 && degrees < 247.5) return '4'; // NW
    if (degrees >= 247.5 && degrees < 292.5) return '5'; // N
    if (degrees >= 292.5 && degrees < 337.5) return '6'; // NE
    return '7'; // E
  }

  /**
   * Gérer le clic de souris pour déplacement
   */
  private handleMouseClick(screenX: number, screenY: number) {
    const gridPos = this.screenToGrid(screenX, screenY);
    
    if (this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
      // ✅ NOUVEAU: Calculer la direction 8 depuis le clic
      const dx = gridPos.x - this.currentPosition.x;
      const dy = gridPos.y - this.currentPosition.y;
      
      const dir8 = this.getDirection8FromVelocity(dx * 100, dy * 100);
      
      const newPosition = {
        x: gridPos.x,
        y: gridPos.y,
        direction: this.mapDir8ToOld(dir8) // Pour compatibilité socket
      };
      
      this.movePlayer(newPosition);
    }
  }

  /**
   * ✅ NOUVEAU: Mapper direction 8 vers anciennes directions
   */
  private mapDir8ToOld(dir8: string): string {
    const map: { [key: string]: string } = {
      '0': 'right',  // SE
      '1': 'down',   // S
      '2': 'left',   // SW
      '3': 'left',   // W
      '4': 'up',     // NW
      '5': 'up',     // N
      '6': 'right',  // NE
      '7': 'right'   // E
    };
    return map[dir8] || 'down';
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

    // Vérifier si mode placement actif
    this.checkPlacementMode();

    // Annuler placement avec ESC
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      const { setPlacementMode } = useStore.getState();
      setPlacementMode(false);
      if (this.placementGhost) {
        this.placementGhost.destroy();
        this.placementGhost = null;
      }
    }

    // ✅ NOUVEAU: Mouvement avec calcul de direction 8
    let vx = 0;
    let vy = 0;
    
    if (this.cursors.left.isDown) vx = -1;
    else if (this.cursors.right.isDown) vx = 1;
    
    if (this.cursors.up.isDown) vy = -1;
    else if (this.cursors.down.isDown) vy = 1;
    
    if (vx !== 0 || vy !== 0) {
      // Calculer la nouvelle direction
      const dir8 = this.getDirection8FromVelocity(vx, vy);
      
      // Calculer la nouvelle position
      const newPosition = {
        x: this.currentPosition.x + vx,
        y: this.currentPosition.y + vy,
        direction: this.mapDir8ToOld(dir8)
      };
      
      if (this.isValidPosition(newPosition)) {
        this.currentDir8 = dir8;
        this.movePlayer(newPosition);
      }
    } else {
      // Pas de mouvement = jouer idle
      if (this.player.anims.currentAnim?.key !== `idle_${this.currentDir8}`) {
        this.player.play(`idle_${this.currentDir8}`);
      }
    }
  }

  // [TOUTES LES AUTRES MÉTHODES RESTENT IDENTIQUES]
  // Je copie le reste sans modifications...

  private checkPlacementMode() {
    const { placementMode } = useStore.getState();

    if (placementMode.active && !this.placementGhost && placementMode.furnitureType) {
      this.createPlacementGhost(placementMode.furnitureType);
    }

    if (!placementMode.active && this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
      this.placementRotation = 0;
    }

    if (this.placementGhost && this.input.activePointer) {
      const pointer = this.input.activePointer;
      const gridPos = this.screenToGrid(pointer.worldX, pointer.worldY);
      
      if (this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
        const isoPos = this.cartToIso(gridPos.x, gridPos.y);
        this.placementGhost.setPosition(isoPos.x, isoPos.y - 20);
      }
    }
  }

  private createPlacementGhost(furnitureType: string) {
    const pointer = this.input.activePointer;
    const gridPos = this.screenToGrid(pointer.worldX, pointer.worldY);
    const isoPos = this.cartToIso(gridPos.x, gridPos.y);

    this.placementGhost = this.add.image(isoPos.x, isoPos.y - 20, furnitureType);
    this.placementGhost.setDepth(999);
    this.placementGhost.setAlpha(0.6);
    this.placementGhost.setTint(0x4a90e2);
    this.placementGhost.setRotation((this.placementRotation * Math.PI) / 180);
  }

  private showPlayerProfile(userId: string, username: string, level: number, screenX: number, screenY: number) {
    console.log('Afficher profil:', username);
    
    this.closePlayerProfile();

    const overlay = document.createElement('div');
    overlay.id = 'player-profile-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 9999;
      backdrop-filter: blur(2px);
    `;
    document.body.appendChild(overlay);

    const profileDiv = document.createElement('div');
    profileDiv.id = 'player-profile';
    profileDiv.style.cssText = `
      position: fixed;
      left: ${screenX + 20}px;
      top: ${screenY}px;
      background: rgba(30, 30, 35, 0.98);
      border: 2px solid rgba(102, 126, 234, 0.4);
      border-radius: 16px;
      padding: 16px;
      min-width: 200px;
      z-index: 10000;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
      animation: menuSlideIn 0.25s ease-out;
      font-family: 'Arial', sans-serif;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
    `;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.closePlayerProfile();
    };
    closeBtn.onmouseenter = () => {
      closeBtn.style.background = 'rgba(255, 60, 60, 0.8)';
      closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      closeBtn.style.transform = 'scale(1)';
    };
    profileDiv.appendChild(closeBtn);

    const avatar = document.createElement('div');
    avatar.textContent = '👤';
    avatar.style.cssText = `
      font-size: 48px;
      text-align: center;
      margin-bottom: 12px;
    `;
    profileDiv.appendChild(avatar);

    const nameDiv = document.createElement('div');
    nameDiv.textContent = username;
    nameDiv.style.cssText = `
      color: #FFD700;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 8px;
    `;
    profileDiv.appendChild(nameDiv);

    const levelDiv = document.createElement('div');
    levelDiv.innerHTML = `<span style="color: rgba(255, 255, 255, 0.7);">Niveau:</span> <span style="color: #667eea; font-weight: 600;">${level}</span>`;
    levelDiv.style.cssText = `
      font-size: 14px;
      text-align: center;
      margin-bottom: 16px;
    `;
    profileDiv.appendChild(levelDiv);

    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 12px 0;
    `;
    profileDiv.appendChild(separator);

    const messageBtn = document.createElement('button');
    messageBtn.innerHTML = `💬 Envoyer message`;
    messageBtn.style.cssText = `
      width: 100%;
      padding: 10px 14px;
      margin: 4px 0;
      background: rgba(74, 144, 226, 0.2);
      border: 1px solid rgba(74, 144, 226, 0.4);
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    messageBtn.onclick = () => {
      alert('Fonctionnalité à venir!');
    };
    messageBtn.onmouseenter = () => {
      messageBtn.style.background = 'rgba(74, 144, 226, 0.35)';
      messageBtn.style.transform = 'translateX(3px)';
    };
    messageBtn.onmouseleave = () => {
      messageBtn.style.background = 'rgba(74, 144, 226, 0.2)';
      messageBtn.style.transform = 'translateX(0)';
    };
    profileDiv.appendChild(messageBtn);

    document.body.appendChild(profileDiv);

    setTimeout(() => {
      overlay.addEventListener('click', () => {
        this.closePlayerProfile();
      });
    }, 100);
  }

  private closePlayerProfile() {
    const profile = document.getElementById('player-profile');
    const overlay = document.getElementById('player-profile-overlay');
    if (profile) profile.remove();
    if (overlay) overlay.remove();
  }

  private showFurnitureMenu(furnitureId: string, screenX: number, screenY: number) {
    console.log('showFurnitureMenu appelé:', furnitureId, 'Position pointer:', screenX, screenY);
    
    this.closeFurnitureMenu();

    const { placedFurniture } = useStore.getState();
    const furniture = placedFurniture.find(f => f.id === furnitureId);
    if (!furniture) {
      console.log('Meuble non trouvé dans le store:', furnitureId);
      return;
    }

    console.log('Meuble trouvé:', furniture);

    const menuX = screenX + 20;
    const menuY = screenY;
    
    console.log('Position menu calculée:', menuX, menuY);

    if (!document.getElementById('furniture-menu-style')) {
      const style = document.createElement('style');
      style.id = 'furniture-menu-style';
      style.textContent = `
        @keyframes menuSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .furniture-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 9999;
          backdrop-filter: blur(2px);
        }
      `;
      document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'furniture-menu-overlay';
    overlay.id = 'furniture-menu-overlay';
    document.body.appendChild(overlay);
    console.log('Overlay ajouté');

    const menuDiv = document.createElement('div');
    menuDiv.id = 'furniture-menu';
    menuDiv.style.cssText = `
      position: fixed;
      left: ${menuX}px;
      top: ${menuY}px;
      background: rgba(30, 30, 35, 0.98);
      border: 2px solid rgba(102, 126, 234, 0.4);
      border-radius: 16px;
      padding: 12px;
      min-width: 180px;
      z-index: 10000;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
      animation: menuSlideIn 0.25s ease-out;
      font-family: 'Arial', sans-serif;
    `;

    console.log('Menu créé avec position:', menuX, menuY);
    console.log('MenuDiv style:', menuDiv.style.cssText);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
    `;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.closeFurnitureMenu();
    };
    closeBtn.onmouseenter = () => {
      closeBtn.style.background = 'rgba(255, 60, 60, 0.8)';
      closeBtn.style.borderColor = 'rgba(255, 60, 60, 1)';
      closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    };
    menuDiv.appendChild(closeBtn);

    const imageSection = document.createElement('div');
    imageSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      margin-bottom: 12px;
    `;

    const furnitureIcon = document.createElement('div');
    furnitureIcon.textContent = furniture.icon;
    furnitureIcon.style.cssText = `
      font-size: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    `;
    imageSection.appendChild(furnitureIcon);

    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
      flex: 1;
    `;

    const nameDiv = document.createElement('div');
    nameDiv.textContent = furniture.name;
    nameDiv.style.cssText = `
      color: white;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 2px;
    `;
    infoDiv.appendChild(nameDiv);

    const rotationDiv = document.createElement('div');
    rotationDiv.id = 'furniture-rotation-display';
    rotationDiv.textContent = `${furniture.rotation}°`;
    rotationDiv.style.cssText = `
      color: #667eea;
      font-size: 11px;
      font-weight: 500;
    `;
    infoDiv.appendChild(rotationDiv);

    imageSection.appendChild(infoDiv);
    menuDiv.appendChild(imageSection);

    const rotateBtn = document.createElement('button');
    rotateBtn.innerHTML = `
      <span style="font-size: 16px;">🔄</span>
      <span>Rotate</span>
    `;
    rotateBtn.style.cssText = `
      width: 100%;
      padding: 10px 14px;
      margin: 4px 0;
      background: rgba(74, 144, 226, 0.2);
      border: 1px solid rgba(74, 144, 226, 0.4);
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    `;
    rotateBtn.onclick = (e) => {
      e.stopPropagation();
      this.rotateFurniture(furnitureId);
      const rotDisplay = document.getElementById('furniture-rotation-display');
      if (rotDisplay) {
        const newFurniture = useStore.getState().placedFurniture.find(f => f.id === furnitureId);
        if (newFurniture) {
          rotDisplay.textContent = `${newFurniture.rotation}°`;
        }
      }
    };
    rotateBtn.onmouseenter = () => {
      rotateBtn.style.background = 'rgba(74, 144, 226, 0.35)';
      rotateBtn.style.borderColor = 'rgba(74, 144, 226, 0.6)';
      rotateBtn.style.transform = 'translateX(3px)';
    };
    rotateBtn.onmouseleave = () => {
      rotateBtn.style.background = 'rgba(74, 144, 226, 0.2)';
      rotateBtn.style.borderColor = 'rgba(74, 144, 226, 0.4)';
      rotateBtn.style.transform = 'translateX(0)';
    };
    menuDiv.appendChild(rotateBtn);

    const pickupBtn = document.createElement('button');
    pickupBtn.innerHTML = `
      <span style="font-size: 16px;">🎒</span>
      <span>Pick up</span>
    `;
    pickupBtn.style.cssText = `
      width: 100%;
      padding: 10px 14px;
      margin: 4px 0;
      background: rgba(243, 156, 18, 0.2);
      border: 1px solid rgba(243, 156, 18, 0.4);
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    `;
    pickupBtn.onclick = () => {
      this.pickUpFurniture(furnitureId);
      this.closeFurnitureMenu();
    };
    pickupBtn.onmouseenter = () => {
      pickupBtn.style.background = 'rgba(243, 156, 18, 0.35)';
      pickupBtn.style.borderColor = 'rgba(243, 156, 18, 0.6)';
      pickupBtn.style.transform = 'translateX(3px)';
    };
    pickupBtn.onmouseleave = () => {
      pickupBtn.style.background = 'rgba(243, 156, 18, 0.2)';
      pickupBtn.style.borderColor = 'rgba(243, 156, 18, 0.4)';
      pickupBtn.style.transform = 'translateX(0)';
    };
    menuDiv.appendChild(pickupBtn);

    document.body.appendChild(menuDiv);
    console.log('Menu ajouté au DOM, élément:', document.getElementById('furniture-menu'));

    setTimeout(() => {
      overlay.addEventListener('click', () => {
        this.closeFurnitureMenu();
      });
    }, 100);
  }

  private closeFurnitureMenu() {
    const menu = document.getElementById('furniture-menu');
    const overlay = document.getElementById('furniture-menu-overlay');
    if (menu) menu.remove();
    if (overlay) overlay.remove();
  }

  private rotateFurniture(furnitureId: string) {
    const { updateFurnitureRotation, placedFurniture } = useStore.getState();
    
    const furniture = placedFurniture.find(f => f.id === furnitureId);
    if (!furniture) return;

    const newRotation = (furniture.rotation + 90) % 360;

    updateFurnitureRotation(furnitureId, newRotation);

    const sprite = this.placedFurnitureSprites.get(furnitureId);
    if (sprite) {
      sprite.setRotation((newRotation * Math.PI) / 180);
    }

    socketService.socket?.emit('rotateFurniture', {
      furnitureId: furnitureId,
      rotation: newRotation
    });

    console.log('Meuble pivoté:', furnitureId, newRotation + '°');
  }

  private placeFurniture(worldX: number, worldY: number) {
    const { placementMode, setPlacementMode, addPlacedFurniture } = useStore.getState();
    
    if (!placementMode.active || !placementMode.furnitureType) return;

    const gridPos = this.screenToGrid(worldX, worldY);
    
    if (!this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
      console.log('Position invalide!');
      return;
    }

    const furnitureId = `furniture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const placedFurniture = {
      id: furnitureId,
      furnitureType: placementMode.furnitureType,
      name: placementMode.furnitureName || 'Meuble',
      icon: placementMode.furnitureIcon || '🪑',
      x: gridPos.x,
      y: gridPos.y,
      rotation: this.placementRotation,
    };

    addPlacedFurniture(placedFurniture);

    socketService.socket?.emit('placeFurniture', {
      furnitureId: furnitureId,
      x: gridPos.x,
      y: gridPos.y,
      rotation: this.placementRotation
    });

    const isoPos = this.cartToIso(gridPos.x, gridPos.y);
    const furnitureSprite = this.add.image(isoPos.x, isoPos.y - 20, placementMode.furnitureType);
    furnitureSprite.setDepth(500);
    furnitureSprite.setRotation((this.placementRotation * Math.PI) / 180);
    furnitureSprite.setInteractive({ cursor: 'pointer', useHandCursor: true });
    furnitureSprite.setData('furnitureId', furnitureId);
    
    furnitureSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('Clic sur meuble:', furnitureId);
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      this.showFurnitureMenu(furnitureId, pointer.x, pointer.y);
    }, this);

    this.placedFurnitureSprites.set(furnitureId, furnitureSprite);

    setPlacementMode(false);
    if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
    }
    this.placementRotation = 0;

    console.log('Meuble placé!', placedFurniture);
  }

  private pickUpFurniture(furnitureId: string) {
    const { removePlacedFurniture, placementMode } = useStore.getState();
    
    if (placementMode.active) return;

    const sprite = this.placedFurnitureSprites.get(furnitureId);
    if (sprite) {
      sprite.destroy();
      this.placedFurnitureSprites.delete(furnitureId);
    }

    removePlacedFurniture(furnitureId);
    
    socketService.socket?.emit('removeFurniture', {
      furnitureId: furnitureId
    });
    
    console.log('Meuble ramassé:', furnitureId);
  }

  private loadPlacedFurniture() {
    const { placedFurniture } = useStore.getState();

    placedFurniture.forEach((furniture) => {
      const isoPos = this.cartToIso(furniture.x, furniture.y);
      const sprite = this.add.image(isoPos.x, isoPos.y - 20, furniture.furnitureType);
      sprite.setDepth(500);
      sprite.setRotation((furniture.rotation * Math.PI) / 180);
      sprite.setInteractive({ cursor: 'pointer', useHandCursor: true });
      sprite.setData('furnitureId', furniture.id);
      
      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        console.log('Clic sur meuble chargé:', furniture.id);
        if (pointer.event) {
          pointer.event.stopPropagation();
        }
        this.showFurnitureMenu(furniture.id, pointer.x, pointer.y);
      }, this);

      this.placedFurnitureSprites.set(furniture.id, sprite);
    });

    console.log('Meubles chargés:', placedFurniture.length);
  }

  private cartToIso(x: number, y: number): { x: number; y: number } {
    const isoX = (x - y) * (ISO_TILE_WIDTH / 2) + 400;
    const isoY = (x + y) * (ISO_TILE_HEIGHT / 2) + 100;
    return { x: isoX, y: isoY };
  }

  private getDepth(x: number, y: number): number {
    return (x + y) * 10;
  }

  /**
   * ✅ MODIFIÉ: Utiliser animations 8 directions
   */
  private getDirectionSprite(direction: string, color: string = 'blue'): string {
    // Mapper anciennes directions vers 8 directions
    const dirMap: { [key: string]: string } = {
      'down': '1',   // S
      'right': '7',  // E
      'up': '5',     // N
      'left': '3',   // W
    };
    
    return dirMap[direction] || '1';
  }

  private createIsoRoom() {
    const roomWidth = 20;
    const roomHeight = 15;
    const store = useStore.getState();
    const floorType = store.currentRoom?.floor || 'checkered_gray';
    const tileKey = `floor_${floorType}`;
    const wallColor = 'gray';

    console.log('Creating room with floor:', tileKey);

    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        const isoPos = this.cartToIso(x, y);
        const tile = this.add.image(isoPos.x, isoPos.y, tileKey);
        tile.setDepth(0);
        
        if (!this.textures.exists(tileKey)) {
          console.error('Texture manquante:', tileKey);
        }
      }
    }

    for (let x = 0; x < roomWidth; x++) {
      const isoPos = this.cartToIso(x, 0);
      const wall = this.add.image(isoPos.x, isoPos.y - WALL_HEIGHT / 2, `wall_${wallColor}`);
      wall.setDepth(10);
    }

    for (let y = 0; y < roomHeight; y++) {
      const isoPos = this.cartToIso(0, y);
      const wall = this.add.image(isoPos.x, isoPos.y - WALL_HEIGHT / 2, `wall_${wallColor}`);
      wall.setDepth(10);
      wall.setAlpha(0.7);
    }

    const doorPos = this.cartToIso(roomWidth - 1, roomHeight - 1);
    const door = this.add.image(doorPos.x + 32, doorPos.y + 16, 'door');
    door.setDepth(100);
    door.setScale(0.8);

    this.addFurniture(5, 5, 'furniture_chair');
    this.addFurniture(12, 5, 'furniture_table');
    this.addFurniture(3, 12, 'furniture_plant');
    this.addFurniture(15, 10, 'furniture_chair');
  }

  private addFurniture(x: number, y: number, type: string) {
    const isoPos = this.cartToIso(x, y);
    const furniture = this.add.image(isoPos.x, isoPos.y - 20, type);
    furniture.setDepth(300);
  }

  /**
   * ✅ MODIFIÉ: Créer sprite avec nouveau système 8 directions
   */
  private createPlayerSprite(userId: string, player: Player) {
    const isoPos = this.cartToIso(player.position.x, player.position.y);
    
    // ✅ NOUVEAU: Utiliser sprite 8 directions pour autres joueurs
    const sprite = this.add.sprite(isoPos.x, isoPos.y, 'character_8dir');
    sprite.setDepth(1000);
    sprite.setData('gridX', player.position.x);
    sprite.setData('gridY', player.position.y);
    sprite.setData('userId', userId);
    sprite.setData('username', player.username);
    sprite.setData('level', player.level);
    
    // Jouer animation idle
    sprite.play('idle_1');
    
    sprite.setInteractive({ cursor: 'pointer' });
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      this.showPlayerProfile(userId, player.username, player.level, pointer.x, pointer.y);
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

  /**
   * ✅ MODIFIÉ: Mouvement avec animations 8 directions
   */
  private movePlayer(newPosition: PlayerPosition) {
    this.isMoving = true;
    this.currentPosition = newPosition;

    const isoPos = this.cartToIso(newPosition.x, newPosition.y);
    
    // ✅ NOUVEAU: Jouer l'animation de marche
    this.player.play(`walk_${this.currentDir8}`, true);

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
        
        // ✅ NOUVEAU: Retour à idle
        this.player.play(`idle_${this.currentDir8}`);
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

    /**
     * ✅ MODIFIÉ: Mouvement autres joueurs avec 8 directions
     */
    socketService.onPlayerMoved((data) => {
      const playerData = this.players.get(data.userId);
      if (playerData) {
        const { sprite, nameText } = playerData;
        const isoPos = this.cartToIso(data.position.x, data.position.y);
        
        // ✅ NOUVEAU: Calculer direction 8 pour autres joueurs
        const oldX = sprite.getData('gridX') || 0;
        const oldY = sprite.getData('gridY') || 0;
        const dx = data.position.x - oldX;
        const dy = data.position.y - oldY;
        
        const dir8 = this.getDirection8FromVelocity(dx * 100, dy * 100);
        
        // Jouer animation de marche
        sprite.play(`walk_${dir8}`, true);
        
        this.tweens.add({
          targets: sprite,
          x: isoPos.x,
          y: isoPos.y,
          duration: 200,
          ease: 'Linear',
          onComplete: () => {
            // Retour à idle
            sprite.play(`idle_${dir8}`);
          }
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
