import Phaser from 'phaser';

export type BubbleType = 'normal' | 'shout' | 'whisper';

export class ChatBubble extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private tail: Phaser.GameObjects.Graphics;
  private bubbleType: BubbleType;
  private startY: number;
  private creationTime: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    username: string,
    message: string,
    bubbleType: BubbleType = 'normal'
  ) {
    super(scene, x, y);
    
    this.bubbleType = bubbleType;
    this.startY = y;
    this.creationTime = Date.now();

    // Créer la queue de la bulle (triangle)
    this.tail = scene.add.graphics();
    this.add(this.tail);

    // Créer le fond de la bulle
    this.background = scene.add.graphics();
    this.add(this.background);

    // Créer le texte avec le nom de l'utilisateur
    const textStyle = this.getTextStyle();
    let fullMessage = `${username}: ${message}`;
    
    // Si c'est un cri, mettre en MAJUSCULES
    if (bubbleType === 'shout') {
      fullMessage = fullMessage.toUpperCase();
    }
    
    this.text = scene.add.text(0, 0, fullMessage, textStyle);
    this.text.setOrigin(0.5, 0.5);
    this.text.setWordWrapWidth(180); // ✅ Réduit pour bulle plus mince
    this.add(this.text);

    // Dessiner la bulle
    this.drawBubble();

    // Ajouter au conteneur de la scène
    scene.add.existing(this);
    
    // IMPORTANT: Depth très élevé pour être au-dessus de TOUT
    this.setDepth(10000);

    // Ajuster la taille selon le zoom de la caméra pour garder taille constante
    this.updateScale();

    // Démarrer l'animation de montée CONTINUE
    this.startFloatAnimation();

    // Auto-destruction après 30 secondes
    this.scene.time.delayedCall(30000, () => {
      this.destroy();
    });
  }

  private getTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '13px', // ✅ Réduit
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 160 }, // ✅ Réduit
      padding: { x: 6, y: 4 }, // ✅ Padding réduit pour bulle mince
    };

    switch (this.bubbleType) {
      case 'shout':
        return {
          ...baseStyle,
          fontSize: '14px',
          fontFamily: 'Arial Black, Arial, sans-serif',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        };
      case 'whisper':
        return {
          ...baseStyle,
          fontSize: '12px',
          fontStyle: 'italic',
          color: '#ffffff',
        };
      default: // normal (parler)
        return {
          ...baseStyle,
          color: '#ffffff',
        };
    }
  }

  private drawBubble() {
    const padding = 8; // ✅ Padding réduit pour bulle plus mince
    const width = this.text.width + padding * 2;
    const height = this.text.height + padding * 2;
    const radius = 8; // ✅ Coins moins arrondis

    // ✅ NOUVEAU STYLE: Fond noir avec contour vert fin
    let fillColor: number = 0x000000; // Fond noir
    let borderColor: number;
    let borderWidth: number = 2; // ✅ Ligne fine (au lieu de 4)
    let alpha: number = 0.85; // Légèrement transparent

    switch (this.bubbleType) {
      case 'shout':
        borderColor = 0xff0000; // ROUGE pour crier
        break;
      case 'whisper':
        borderColor = 0x0088ff; // BLEU pour chuchoter
        break;
      default:
        borderColor = 0x00ff00; // ✅ VERT pour parler (normal)
    }

    // Dessiner la queue (triangle pointant vers le bas)
    this.tail.clear();
    this.tail.fillStyle(fillColor, alpha);
    this.tail.lineStyle(borderWidth, borderColor, 1);
    this.tail.beginPath();
    this.tail.moveTo(0, height / 2 + 3);
    this.tail.lineTo(-8, height / 2 + 12); // ✅ Queue plus petite
    this.tail.lineTo(8, height / 2 + 12);
    this.tail.closePath();
    this.tail.fillPath();
    this.tail.strokePath();

    // ✅ PAS d'ombre portée pour style plus simple

    // Dessiner le fond de la bulle (noir)
    this.background.fillStyle(fillColor, alpha);
    this.background.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );

    // ✅ CONTOUR VERT FIN (2px)
    this.background.lineStyle(borderWidth, borderColor, 1);
    this.background.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );
  }

  private startFloatAnimation() {
    // Légère oscillation horizontale pour effet vivant
    this.scene.tweens.add({
      targets: this,
      x: this.x + 3, // ✅ Oscillation réduite
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Apparition en fondu
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });
  }

  /**
   * Mettre à jour l'échelle selon le zoom de la caméra
   * Pour garder une taille constante à l'écran
   */
  private updateScale() {
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom;
    
    // Scale inversé au zoom pour garder taille constante
    const targetScale = Phaser.Math.Clamp(1 / zoom, 0.6, 1.4);
    this.setScale(targetScale);
  }

  /**
   * Mettre à jour la position et l'échelle (appelé depuis update de la scène)
   */
  public updateBubble(spriteX: number, spriteY: number) {
    this.updateScale();
  }

  /**
   * Vérifier si la bulle doit être visible pour un joueur donné
   */
  public shouldBeVisibleFor(
    viewerX: number,
    viewerY: number,
    speakerX: number,
    speakerY: number,
    viewerUserId: string,
    targetUserId?: string
  ): boolean {
    switch (this.bubbleType) {
      case 'shout':
        return true;

      case 'whisper':
        return targetUserId === viewerUserId;

      case 'normal':
      default:
        const maxDistance = 5;
        const distance = Math.sqrt(
          Math.pow(viewerX - speakerX, 2) + Math.pow(viewerY - speakerY, 2)
        );
        return distance <= maxDistance;
    }
  }

  public getBubbleType(): BubbleType {
    return this.bubbleType;
  }

  public getAge(): number {
    return Date.now() - this.creationTime;
  }
}
