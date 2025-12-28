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
  // TileHighLight
  private tileHighlight: Phaser.GameObjects.Graphics | null = null;
  // ✅ NOUVEAU: Système de drag caméra avec clic droit
  private isDraggingCamera = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;



  constructor() {
    super({ key: 'LobbySceneIso' });
  }

  preload() {
    // Charger les tuiles de sol
    const tileTypes = [
      'wooden', 'checkered_gray', 'checkered_blue', 'checkered_green',
      'marble', 'carpet_red', 'carpet_blue', 'carpet_purple', 'carpet_gold',
      'grass', 'water', 'stone', 'grass_mod', 'brick'  // ← AJOUTÉ brick!
    ];
    
    tileTypes.forEach(type => {
      this.load.image(`floor_${type}`, `/assets/habbo-tiles/floor_${type}.png`);
    });

    // Charger les personnages isométriques (4 directions × 4 couleurs)
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

  /**
   * ✅ NOUVEAU: Créer les animations pour les 8 directions
   */
  private createCharacterAnimations() {
    // Vérifier si le sprite est chargé
    if (!this.textures.exists('character_8dir')) {
      console.warn('Sprite character_8dir non chargé, animations non créées');
      return;
    }

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

    // Tile High light
    this.tileHighlight = this.add.graphics();
    this.tileHighlight.setDepth(5);
    this.input.on('pointermove', (pointer) => {
      this.updateTileHighlight(pointer.worldX, pointer.worldY);
});
    
    // Créer le joueur principal
    const isoPos = this.cartToIso(this.currentPosition.x, this.currentPosition.y);
    
    // ✅ MODIFIÉ: Utiliser le sprite 8 directions si disponible, sinon l'ancien
    const spriteKey = this.textures.exists('character_8dir') ? 'character_8dir' : 'char_blue_se';
    const spriteFrame = this.textures.exists('character_8dir') ? 0 : undefined;
    
    this.player = this.add.sprite(isoPos.x, isoPos.y, spriteKey, spriteFrame);
    this.player.setDepth(1000); // Depth élevé pour être toujours au-dessus
    this.player.setData('gridX', this.currentPosition.x);
    this.player.setData('gridY', this.currentPosition.y);
    
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
    this.playerNameText.setDepth(1001); // Au-dessus du personnage
    this.playerNameText.setVisible(false); // ← CACHÉ!

    // **NOUVEAU: Configurer la caméra**
    this.cameras.main.setZoom(1);

    // ✅ NOUVEAU: Drag de la caméra avec clic droit
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (pointer.rightButtonDown()) {
    this.isDraggingCamera = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.cameraStartX = this.cameras.main.scrollX;
    this.cameraStartY = this.cameras.main.scrollY;
    this.input.setDefaultCursor('grabbing');
  }
});

this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
  if (this.isDraggingCamera) {
    const deltaX = pointer.x - this.dragStartX;
    const deltaY = pointer.y - this.dragStartY;
    
    this.cameras.main.scrollX = this.cameraStartX - deltaX;
    this.cameras.main.scrollY = this.cameraStartY - deltaY;
  }
});

this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
  if (this.isDraggingCamera) {
    this.isDraggingCamera = false;
    this.input.setDefaultCursor('default');
  }
});

    // **NOUVEAU: Contrôles de zoom avec la molette**
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
      const currentZoom = this.cameras.main.zoom;
      const zoomAmount = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(currentZoom + zoomAmount, 0.5, 2.5); // Min 0.5, Max 2.5
      
      this.cameras.main.setZoom(newZoom);
    });

    // Configurer les contrôles CLAVIER (optionnel - garde les flèches)
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Touches pour système de meubles
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // IMPORTANT: Désactiver la capture des touches pour permettre le chat
    this.input.keyboard!.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.removeCapture(Phaser.Input.Keyboard.KeyCodes.R);

    // **Variable pour gérer le double-clic**
    let lastClickTime = 0;
    const doubleClickDelay = 300; // ms

 // **Configurer le clic souris pour déplacement OU placement**
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // ✅ NOUVEAU: Ignorer le clic droit (réservé pour la caméra)
      if (pointer.rightButtonDown()) return;
      
      if (!this.isMoving) {
        const placementMode = useStore.getState().placementMode;
        
        if (placementMode.active) {
          // Mode placement: placer le meuble
          this.placeFurniture(pointer.worldX, pointer.worldY);
        } else {
          // Mode normal: double-clic pour se déplacer
          const currentTime = Date.now();
          const timeSinceLastClick = currentTime - lastClickTime;
          
          if (timeSinceLastClick < doubleClickDelay) {
            // Double-clic détecté: se déplacer
            this.handleMouseClick(pointer.worldX, pointer.worldY);
          }
          // Sinon, c'est un simple clic (ne fait rien, les meubles gèrent leurs propres clics)
          
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
        
        // Créer les sprites pour les autres joueurs
        Object.entries(data.players).forEach(([userId, player]) => {
          if (userId !== store.user?.id) {
            this.createPlayerSprite(userId, player);
          }
        });
      });
    }
  }

  /**
   * Gérer le clic de souris pour déplacement
   */
  private handleMouseClick(screenX: number, screenY: number) {
    // Convertir les coordonnées écran vers grille iso
    const gridPos = this.screenToGrid(screenX, screenY);
    
    if (this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
      // Calculer la direction
      const dx = gridPos.x - this.currentPosition.x;
      const dy = gridPos.y - this.currentPosition.y;
      
      let direction = 'down';
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      
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

  /**
   * ✅ NOUVEAU: Mettre à jour le highlight de la tuile survolée
   */
  private updateTileHighlight(worldX: number, worldY: number) {
    if (!this.tileHighlight) return;

    const gridPos = this.screenToGrid(worldX, worldY);
    const isValid = this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' });
    
    if (isValid) {
      const isoPos = this.cartToIso(gridPos.x, gridPos.y);
      
      this.tileHighlight.clear();
      this.tileHighlight.lineStyle(2, 0xFFFFFF, 0.8);
      this.tileHighlight.fillStyle(0xFFFFFF, 0.2);
      
      const halfWidth = ISO_TILE_WIDTH / 2;
      const halfHeight = ISO_TILE_HEIGHT / 2;
      
      this.tileHighlight.beginPath();
      this.tileHighlight.moveTo(isoPos.x, isoPos.y - halfHeight);
      this.tileHighlight.lineTo(isoPos.x + halfWidth, isoPos.y);
      this.tileHighlight.lineTo(isoPos.x, isoPos.y + halfHeight);
      this.tileHighlight.lineTo(isoPos.x - halfWidth, isoPos.y);
      this.tileHighlight.closePath();
      this.tileHighlight.fillPath();
      this.tileHighlight.strokePath();
    } else {
      this.tileHighlight.clear();
    }
  }


  update() {
    if (!this.player || this.isMoving) return;

    // IMPORTANT: Ne pas traiter les touches si le chat est actif
    const { chatInputFocused } = useStore.getState();
    
    if (chatInputFocused) {
      return; // Ignorer toutes les touches du jeu
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

    const newPosition = { ...this.currentPosition };
    let moved = false;
    let newDir = this.currentPosition.direction;

    // Conversion des directions vers iso
    if (this.cursors.left.isDown) {
      newPosition.x -= 1;
      newDir = 'left';
      moved = true;
    } else if (this.cursors.right.isDown) {
      newPosition.x += 1;
      newDir = 'right';
      moved = true;
    } else if (this.cursors.up.isDown) {
      newPosition.y -= 1;
      newDir = 'up';
      moved = true;
    } else if (this.cursors.down.isDown) {
      newPosition.y += 1;
      newDir = 'down';
      moved = true;
    }

    if (moved && this.isValidPosition(newPosition)) {
      newPosition.direction = newDir;
      this.movePlayer(newPosition);
    }
  }

  /**
   * Vérifier et gérer le mode placement
   */
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

    // Mettre à jour la position du fantôme
    if (this.placementGhost && this.input.activePointer) {
      const pointer = this.input.activePointer;
      const gridPos = this.screenToGrid(pointer.worldX, pointer.worldY);
      
      if (this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
        const isoPos = this.cartToIso(gridPos.x, gridPos.y);
        this.placementGhost.setPosition(isoPos.x, isoPos.y - 20);
      }
    }
  }

  /**
   * Créer l'aperçu fantôme pour placement
   */
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

  /**
   * Afficher le profil d'un joueur
   */
  private showPlayerProfile(userId: string, username: string, level: number, screenX: number, screenY: number) {
    console.log('Afficher profil:', username);
    
    // Fermer le profil existant
    this.closePlayerProfile();

    // Créer l'overlay
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

    // Créer le menu de profil
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

    // Bouton X
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

    // Avatar (emoji)
    const avatar = document.createElement('div');
    avatar.textContent = '👤';
    avatar.style.cssText = `
      font-size: 48px;
      text-align: center;
      margin-bottom: 12px;
    `;
    profileDiv.appendChild(avatar);

    // Nom d'utilisateur
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

    // Niveau
    const levelDiv = document.createElement('div');
    levelDiv.innerHTML = `<span style="color: rgba(255, 255, 255, 0.7);">Niveau:</span> <span style="color: #667eea; font-weight: 600;">${level}</span>`;
    levelDiv.style.cssText = `
      font-size: 14px;
      text-align: center;
      margin-bottom: 16px;
    `;
    profileDiv.appendChild(levelDiv);

    // Ligne de séparation
    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 12px 0;
    `;
    profileDiv.appendChild(separator);

    // Bouton Envoyer Message (futur)
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

    // Fermer en cliquant sur l'overlay
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

  /**
   * Afficher le menu contextuel pour un meuble
   */
  private showFurnitureMenu(furnitureId: string, screenX: number, screenY: number) {
    console.log('showFurnitureMenu appelé:', furnitureId, 'Position pointer:', screenX, screenY);
    
    // Fermer le menu existant s'il y en a un
    this.closeFurnitureMenu();

    // Récupérer les infos du meuble
    const { placedFurniture } = useStore.getState();
    const furniture = placedFurniture.find(f => f.id === furnitureId);
    if (!furniture) {
      console.log('Meuble non trouvé dans le store:', furnitureId);
      return;
    }

    console.log('Meuble trouvé:', furniture);

    // Calculer la vraie position dans la fenêtre (pas relative au canvas)
    // screenX et screenY de Phaser sont déjà relatifs à la fenêtre
    const menuX = screenX + 20;
    const menuY = screenY;
    
    console.log('Position menu calculée:', menuX, menuY);

    // Ajouter les animations CSS si elles n'existent pas déjà
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

    // Créer l'overlay semi-transparent
    const overlay = document.createElement('div');
    overlay.className = 'furniture-menu-overlay';
    overlay.id = 'furniture-menu-overlay';
    document.body.appendChild(overlay);
    console.log('Overlay ajouté');

    // Créer le conteneur du menu
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

    // Bouton X pour fermer le menu
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

    // Section de l'image du meuble
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

    // Icône du meuble
    const furnitureIcon = document.createElement('div');
    furnitureIcon.textContent = furniture.icon;
    furnitureIcon.style.cssText = `
      font-size: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    `;
    imageSection.appendChild(furnitureIcon);

    // Info du meuble
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

    // Bouton Rotate
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
      e.stopPropagation(); // Ne pas fermer le menu
      this.rotateFurniture(furnitureId);
      // Mettre à jour l'affichage de la rotation
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

    // Bouton Pick up
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

    // Fermer le menu si on clique sur l'overlay
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

  /**
   * Faire pivoter un meuble placé
   */
  private rotateFurniture(furnitureId: string) {
    const { updateFurnitureRotation, placedFurniture } = useStore.getState();
    
    // Trouver le meuble
    const furniture = placedFurniture.find(f => f.id === furnitureId);
    if (!furniture) return;

    // Calculer la nouvelle rotation
    const newRotation = (furniture.rotation + 90) % 360;

    // Mettre à jour dans le store
    updateFurnitureRotation(furnitureId, newRotation);

    // Mettre à jour le sprite
    const sprite = this.placedFurnitureSprites.get(furnitureId);
    if (sprite) {
      sprite.setRotation((newRotation * Math.PI) / 180);
    }

    // ✅ NOUVEAU: Émettre au serveur pour tracking des quêtes
    socketService.socket?.emit('rotateFurniture', {
      furnitureId: furnitureId,
      rotation: newRotation
    });

    console.log('Meuble pivoté:', furnitureId, newRotation + '°');
  }

  /**
   * Placer le meuble dans la salle
   */
  private placeFurniture(worldX: number, worldY: number) {
    const { placementMode, setPlacementMode, addPlacedFurniture } = useStore.getState();
    
    if (!placementMode.active || !placementMode.furnitureType) return;

    const gridPos = this.screenToGrid(worldX, worldY);
    
    if (!this.isValidPosition({ x: gridPos.x, y: gridPos.y, direction: 'down' })) {
      console.log('Position invalide!');
      return;
    }

    // Créer l'objet meuble placé
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

    // Ajouter au store
    addPlacedFurniture(placedFurniture);

    // ✅ NOUVEAU: Émettre au serveur pour tracking des quêtes
    socketService.socket?.emit('placeFurniture', {
      furnitureId: furnitureId,
      x: gridPos.x,
      y: gridPos.y,
      rotation: this.placementRotation
    });

    // Créer le sprite du meuble
    const isoPos = this.cartToIso(gridPos.x, gridPos.y);
    const furnitureSprite = this.add.image(isoPos.x, isoPos.y - 20, placementMode.furnitureType);
    furnitureSprite.setDepth(500);
    furnitureSprite.setRotation((this.placementRotation * Math.PI) / 180);
    furnitureSprite.setInteractive({ cursor: 'pointer', useHandCursor: true });
    furnitureSprite.setData('furnitureId', furnitureId);
    
    // Gestion du clic pour afficher le menu contextuel
    furnitureSprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('Clic sur meuble:', furnitureId);
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      this.showFurnitureMenu(furnitureId, pointer.x, pointer.y);
    }, this);

    this.placedFurnitureSprites.set(furnitureId, furnitureSprite);

    // Désactiver le mode placement
    setPlacementMode(false);
    if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
    }
    this.placementRotation = 0;

    console.log('Meuble placé!', placedFurniture);
  }

  /**
   * Ramasser un meuble placé
   */
  private pickUpFurniture(furnitureId: string) {
    const { removePlacedFurniture, placementMode } = useStore.getState();
    
    // Ne pas ramasser si on est en mode placement
    if (placementMode.active) return;

    const sprite = this.placedFurnitureSprites.get(furnitureId);
    if (sprite) {
      sprite.destroy();
      this.placedFurnitureSprites.delete(furnitureId);
    }

    removePlacedFurniture(furnitureId);
    
    // ✅ NOUVEAU: Émettre au serveur pour tracking des quêtes
    socketService.socket?.emit('removeFurniture', {
      furnitureId: furnitureId
    });
    
    console.log('Meuble ramassé:', furnitureId);
    
    // TODO: Ajouter +1 à la quantité dans l'inventaire
  }

  /**
   * Charger les meubles placés au démarrage
   */
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

  /**
   * Convertir coordonnées cartésiennes (grille) vers isométriques (écran)
   */
  private cartToIso(x: number, y: number): { x: number; y: number } {
    const isoX = (x - y) * (ISO_TILE_WIDTH / 2) + 400;
    const isoY = (x + y) * (ISO_TILE_HEIGHT / 2) + 100;
    return { x: isoX, y: isoY };
  }

  /**
   * Calculer la profondeur (z-index) basée sur la position en grille
   */
  private getDepth(x: number, y: number): number {
    return (x + y) * 10;
  }

  /**
   * ✅ NOUVEAU: Calculer la direction en 8 directions à partir d'un vecteur
   */
  private getDirection8(dx: number, dy: number): string {
    // Si aucun mouvement, garder la direction actuelle
    if (dx === 0 && dy === 0) {
      return this.currentPosition.direction;
    }

    // Calculer l'angle en degrés
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Normaliser entre 0-360
    const normalized = (angle + 360) % 360;
    
    // Mapper les 8 directions (en coordonnées isométriques)
    // 0° = droite, 90° = bas, 180° = gauche, 270° = haut
    if (normalized >= 337.5 || normalized < 22.5) return 'right';
    if (normalized >= 22.5 && normalized < 67.5) return 'down';
    if (normalized >= 67.5 && normalized < 112.5) return 'down';
    if (normalized >= 112.5 && normalized < 157.5) return 'down';
    if (normalized >= 157.5 && normalized < 202.5) return 'left';
    if (normalized >= 202.5 && normalized < 247.5) return 'up';
    if (normalized >= 247.5 && normalized < 292.5) return 'up';
    return 'up';
  }

  /**
   * Obtenir le sprite de direction basé sur le mouvement
   */
  private getDirectionSprite(direction: string, color: string = 'blue'): string {
    // ✅ MODIFIÉ: Si le sprite 8 directions est disponible, utiliser les animations
    if (this.textures.exists('character_8dir')) {
      // Mapper les 4 directions vers les 8
      const dirMap: { [key: string]: string } = {
        'down': 's',   // Sud
        'right': 'e',  // Est
        'up': 'n',     // Nord
        'left': 'w',   // Ouest
      };
      
      const dir = dirMap[direction] || 's';
      return `walk_${dir}`; // Retourne le nom de l'animation
    }
    
    // Sinon, utiliser l'ancien système 4 directions
    const dirMap: { [key: string]: string } = {
      'down': 'se',
      'right': 'se',
      'up': 'nw',
      'left': 'sw',
    };
    
    const isoDir = dirMap[direction] || 'se';
    return `char_${color}_${isoDir}`;
  }

  private createIsoRoom() {
    const roomWidth = 20;
    const roomHeight = 15;
    const store = useStore.getState();
    const floorType = store.currentRoom?.floor || 'checkered_gray';
    const tileKey = `floor_${floorType}`;
    const wallColor = 'gray';

    console.log('Creating room with floor:', tileKey);

    // Créer le sol - TOUJOURS en arrière-plan
    for (let y = 0; y < roomHeight; y++) {
      for (let x = 0; x < roomWidth; x++) {
        const isoPos = this.cartToIso(x, y);
        const tile = this.add.image(isoPos.x, isoPos.y, tileKey);
        tile.setDepth(0); // Depth fixe très bas pour le sol
        
        // Vérifier si la texture est chargée
        if (!this.textures.exists(tileKey)) {
          console.error('Texture manquante:', tileKey);
        }
      }
    }

    // Créer les murs (arrière et côtés) - Depth 1-99
    // Mur arrière (top)
    for (let x = 0; x < roomWidth; x++) {
      const isoPos = this.cartToIso(x, 0);
      const wall = this.add.image(isoPos.x, isoPos.y - WALL_HEIGHT / 2, `wall_${wallColor}`);
      wall.setDepth(10);
    }

    // Mur gauche
    for (let y = 0; y < roomHeight; y++) {
      const isoPos = this.cartToIso(0, y);
      const wall = this.add.image(isoPos.x, isoPos.y - WALL_HEIGHT / 2, `wall_${wallColor}`);
      wall.setDepth(10);
      wall.setAlpha(0.7);
    }

    // Porte d'entrée - Depth 100
    const doorPos = this.cartToIso(roomWidth - 1, roomHeight - 1);
    const door = this.add.image(doorPos.x + 32, doorPos.y + 16, 'door');
    door.setDepth(100);
    door.setScale(0.8);

    // Ajouter quelques meubles - Depth 200-500
    this.addFurniture(5, 5, 'furniture_chair');
    this.addFurniture(12, 5, 'furniture_table');
    this.addFurniture(3, 12, 'furniture_plant');
    this.addFurniture(15, 10, 'furniture_chair');
  }

  private addFurniture(x: number, y: number, type: string) {
    const isoPos = this.cartToIso(x, y);
    const furniture = this.add.image(isoPos.x, isoPos.y - 20, type);
    furniture.setDepth(300); // Depth fixe pour meubles
  }

  private createPlayerSprite(userId: string, player: Player) {
    const isoPos = this.cartToIso(player.position.x, player.position.y);
    
    // ✅ MODIFIÉ: Utiliser le sprite 8 directions si disponible
    let sprite: Phaser.GameObjects.Sprite;
    const randomColor = ['blue', 'green', 'red', 'yellow'][Math.floor(Math.random() * 4)];
    
    if (this.textures.exists('character_8dir')) {
      sprite = this.add.sprite(isoPos.x, isoPos.y, 'character_8dir', 0);
    } else {
      sprite = this.add.sprite(isoPos.x, isoPos.y, `char_${randomColor}_se`);
    }
    
    sprite.setDepth(1000);
    sprite.setData('gridX', player.position.x);
    sprite.setData('gridY', player.position.y);
    sprite.setData('color', randomColor);
    sprite.setData('userId', userId);
    sprite.setData('username', player.username);
    sprite.setData('level', player.level);
    
    // Rendre le sprite cliquable pour afficher le profil
    sprite.setInteractive({ cursor: 'pointer' });
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.event) {
        pointer.event.stopPropagation();
      }
      this.showPlayerProfile(userId, player.username, player.level, pointer.x, pointer.y);
    }, this);
    
    // Nom du joueur (CACHÉ - on le garde pour ne pas casser le code)
    const nameText = this.add.text(isoPos.x, isoPos.y - 60, player.username, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 },
    });
    nameText.setOrigin(0.5, 1);
    nameText.setDepth(1001); // Au-dessus du sprite
    nameText.setVisible(false); // ← CACHÉ!
    
    this.players.set(userId, { sprite, nameText });
  }

private movePlayer(newPosition: PlayerPosition) {
    this.isMoving = true;
    this.currentPosition = newPosition;

    const isoPos = this.cartToIso(newPosition.x, newPosition.y);
    const newDepth = 1000; // Toujours au-dessus
    
    // ✅ NOUVEAU: Calculer la distance pour ajuster la durée
    const oldPos = this.cartToIso(this.player.getData('gridX'), this.player.getData('gridY'));
    const distance = Phaser.Math.Distance.Between(oldPos.x, oldPos.y, isoPos.x, isoPos.y);
    const moveDuration = Math.max(400, distance * 8); // 8ms par pixel, minimum 400ms
    
    // ✅ MODIFIÉ: Utiliser animations si sprite 8 directions disponible
    const spriteKey = this.getDirectionSprite(newPosition.direction);
    
    if (this.textures.exists('character_8dir')) {
      // Jouer l'animation
      this.player.play(spriteKey);
    } else {
      // Utiliser l'ancien système
      this.player.setTexture(spriteKey);
    }

    // Animer le mouvement
    this.tweens.add({
      targets: this.player,
      x: isoPos.x,
      y: isoPos.y,
      duration: moveDuration,  // ✅ MODIFIÉ: Durée proportionnelle
      ease: 'Linear',
      onComplete: () => {
        this.isMoving = false;
        this.player.setData('gridX', newPosition.x);
        this.player.setData('gridY', newPosition.y);
        
        // ✅ AJOUTÉ: Arrêter l'animation et afficher idle
        if (this.textures.exists('character_8dir')) {
          this.player.stop();
          const dirMap: { [key: string]: string } = {
            'down': 's', 'right': 'e', 'up': 'n', 'left': 'w'
          };
          const dir = dirMap[newPosition.direction] || 's';
          const idleKey = `idle_${dir}`;
          this.player.play(idleKey);
        }
      },
    });

    // Animer le texte du nom
    this.tweens.add({
      targets: this.playerNameText,
      x: isoPos.x,
      y: isoPos.y - 60,
      duration: moveDuration,  // ✅ MODIFIÉ: Même durée que le joueur
      ease: 'Linear',
    });


    // Envoyer la position au serveur
    socketService.move(newPosition);
  }



    // Envoyer la position au serveur
    socketService.move(newPosition);
  }

  private isValidPosition(position: PlayerPosition): boolean {
    return position.x >= 0 && position.x < 20 && position.y >= 0 && position.y < 15;
  }

  private setupSocketEvents() {
    const store = useStore.getState();

    // Nouveau joueur rejoint
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

    // Joueur quitte
    socketService.onPlayerLeft((data) => {
      const playerData = this.players.get(data.userId);
      if (playerData) {
        playerData.nameText.destroy();
        playerData.sprite.destroy();
        this.players.delete(data.userId);
      }
    });

    // Joueur bouge
    socketService.onPlayerMoved((data) => {
      const playerData = this.players.get(data.userId);
      if (playerData) {
        const { sprite, nameText } = playerData;
        const isoPos = this.cartToIso(data.position.x, data.position.y);
        
        // ✅ MODIFIÉ: Utiliser animations si disponible
        const color = sprite.getData('color') || 'green';
        const spriteKey = this.getDirectionSprite(data.position.direction, color);
        
        if (this.textures.exists('character_8dir')) {
          sprite.play(spriteKey);
        } else {
          sprite.setTexture(spriteKey);
        }
        
        this.tweens.add({
          targets: sprite,
          x: isoPos.x,
          y: isoPos.y,
          duration: 400,
          ease: 'Linear',
          onComplete: () => {
            // ✅ AJOUTÉ: Arrêter l'animation
            if (this.textures.exists('character_8dir')) {
              sprite.stop();
              const dirMap: { [key: string]: string } = {
                'down': 's', 'right': 'e', 'up': 'n', 'left': 'w'
              };
              const dir = dirMap[data.position.direction] || 's';
              sprite.play(`idle_${dir}`);
            }
          }
        });

        this.tweens.add({
          targets: nameText,
          x: isoPos.x,
          y: isoPos.y - 60,
          duration: 400,
          ease: 'Linear',
        });
        
        sprite.setData('gridX', data.position.x);
        sprite.setData('gridY', data.position.y);
      }
    });

    // Messages de chat
    socketService.onChatMessage((message: any) => {
      // ChatBox ajoute déjà le message au store, on ne le fait pas ici
      
      // Récupérer le type de message et la cible
      const bubbleType: BubbleType = message.type || 'normal';
      const whisperTarget = message.whisperTarget;
      
      console.log('Message reçu (bulle):', message);
      console.log('Type de bulle:', bubbleType);
      
      // Déterminer si ce joueur doit voir la bulle
      const currentUserId = store.user?.id;
      
      // Afficher la bulle au-dessus du bon personnage
      if (message.user.id === currentUserId) {
        // Message de l'utilisateur actuel
        this.showChatBubble(
          this.player,
          message.user.id,
          message.user.username, // ← AJOUTÉ username
          message.content,
          bubbleType,
          whisperTarget
        );
      } else {
        // Message d'un autre joueur
        const playerData = this.players.get(message.user.id);
        if (playerData) {
          this.showChatBubble(
            playerData.sprite,
            message.user.id,
            message.user.username, // ← AJOUTÉ username
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
    username: string, // ← AJOUTÉ
    message: string,
    bubbleType: BubbleType = 'normal',
    whisperTarget?: string
  ) {
    const store = useStore.getState();
    const currentUserId = store.user?.id;
    
    // Vérifier si ce joueur doit voir cette bulle
    const speakerX = sprite.getData('gridX') || 0;
    const speakerY = sprite.getData('gridY') || 0;
    const viewerX = this.player.getData('gridX') || 0;
    const viewerY = this.player.getData('gridY') || 0;

    // Récupérer les bulles existantes pour cet utilisateur
    if (!this.chatBubbles.has(userId)) {
      this.chatBubbles.set(userId, []);
    }
    
    const userBubbles = this.chatBubbles.get(userId)!;
    
    // NOUVELLE LOGIQUE: Créer la nouvelle bulle à la position de base
    const bubbleY = sprite.y - 60; // Toujours à la même position de base

    // Créer la bulle avec le username
    const bubble = new ChatBubble(
      this,
      sprite.x,
      bubbleY,
      username, // ← AJOUTÉ username
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
      // Ne pas afficher cette bulle pour ce joueur
      bubble.destroy();
      return;
    }

    // IMPORTANT: Pousser TOUTES les bulles existantes vers le haut de 60px
    userBubbles.forEach((existingBubble) => {
      this.tweens.add({
        targets: existingBubble,
        y: existingBubble.y - 60, // Monter de 60px
        duration: 400, // Animation rapide
        ease: 'Power2'
      });
    });

    // Stocker la bulle
    userBubbles.push(bubble);

    // Limiter à 5 bulles max par joueur
    if (userBubbles.length > 5) {
      const oldBubble = userBubbles.shift();
      oldBubble?.destroy();
    }

    // Auto-destruction après 30 secondes
    this.time.delayedCall(30000, () => {
      const index = userBubbles.indexOf(bubble);
      if (index > -1) {
        userBubbles.splice(index, 1);
      }
    });
  }

