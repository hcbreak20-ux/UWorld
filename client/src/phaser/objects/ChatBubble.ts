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

    // ✅ Créer le texte ULTRA COMPACT
    const textStyle = this.getTextStyle();
    let fullMessage = `${username}: ${message}`;
    
    // Si c'est un cri, mettre en MAJUSCULES
    if (bubbleType === 'shout') {
      fullMessage = fullMessage.toUpperCase();
    }
    
    this.text = scene.add.text(0, 0, fullMessage, textStyle);
    this.text.setOrigin(0.5, 0.5);
    this.text.setWordWrapWidth(120); // ✅ TRÈS court pour bulle mince
    this.add(this.text);

    // Dessiner la bulle
    this.drawBubble();

    // Ajouter au conteneur de la scène
    scene.add.existing(this);
    
    // IMPORTANT: Depth très élevé pour être au-dessus de TOUT
    this.setDepth(10000);

    // Ajuster la taille selon le zoom de la caméra
    this.updateScale();

    // ✅ NOUVEAU: Démarrer l'animation de MONTÉE CONTINUE
    this.startContinuousRiseAnimation();

    // Auto-destruction après 30 secondes
    this.scene.time.delayedCall(30000, () => {
      this.destroy();
    });
  }

  private getTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '11px', // ✅ TRÈS petit
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 110 },
      padding: { x: 3, y: 2 }, // ✅ Padding minimal
    };

    switch (this.bubbleType) {
      case 'shout':
        return {
          ...baseStyle,
          fontSize: '12px',
          fontFamily: 'Arial Black, Arial, sans-serif',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 1,
        };
      case 'whisper':
        return {
          ...baseStyle,
          fontSize: '10px',
          fontStyle: 'italic',
          color: '#ffffff',
        };
      default:
        return {
          ...baseStyle,
          color: '#ffffff',
        };
    }
  }

  private drawBubble() {
    const padding = 4; // ✅ Padding MINIMAL
    const width = this.text.width + padding * 2;
    const height = this.text.height + padding * 2;
    const radius = 6; // ✅ Coins peu arrondis

    // Fond noir avec contour vert fin
    let fillColor: number = 0x000000;
    let borderColor: number;
    let borderWidth: number = 1.5; // ✅ Ligne TRÈS fine
    let alpha: number = 0.85;

    switch (this.bubbleType) {
      case 'shout':
        borderColor = 0xff0000; // ROUGE
        break;
      case 'whisper':
        borderColor = 0x0088ff; // BLEU
        break;
      default:
        borderColor = 0x00ff00; // VERT
    }

    // Queue (triangle très petit)
    this.tail.clear();
    this.tail.fillStyle(fillColor, alpha);
    this.tail.lineStyle(borderWidth, borderColor, 1);
    this.tail.beginPath();
    this.tail.moveTo(0, height / 2 + 2);
    this.tail.lineTo(-5, height / 2 + 8); // ✅ Queue minuscule
    this.tail.lineTo(5, height / 2 + 8);
    this.tail.closePath();
    this.tail.fillPath();
    this.tail.strokePath();

    // Fond de la bulle (noir)
    this.background.fillStyle(fillColor, alpha);
    this.background.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );

    // Contour vert très fin
    this.background.lineStyle(borderWidth, borderColor, 1);
    this.background.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );
  }

  private startContinuousRiseAnimation() {
    // ✅ MONTÉE CONTINUE toutes les 5 secondes
    const riseInterval = 5000; // 5 secondes
    const riseDistance = 100; // Monter de 100px à chaque fois

    // Fonction qui fait monter la bulle
    const rise = () => {
      this.scene.tweens.add({
        targets: this,
        y: this.y - riseDistance,
        duration: 4000, // Animation douce de 4 secondes
        ease: 'Sine.easeInOut',
      });
    };

    // Première montée après 5 secondes
    this.scene.time.delayedCall(riseInterval, () => {
      rise();
      
      // Ensuite, monter toutes les 5 secondes
      const riseTimer = this.scene.time.addEvent({
        delay: riseInterval,
        callback: rise,
        loop: true
      });

      // Nettoyer le timer quand la bulle est détruite
      this.on('destroy', () => {
        riseTimer.remove();
      });
    });

    // Légère oscillation horizontale
    this.scene.tweens.add({
      targets: this,
      x: this.x + 2,
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
      duration: 300,
      ease: 'Power2',
    });
  }

  private updateScale() {
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom;
    
    const targetScale = Phaser.Math.Clamp(1 / zoom, 0.6, 1.4);
    this.setScale(targetScale);
  }

  public updateBubble(spriteX: number, spriteY: number) {
    this.updateScale();
  }

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
