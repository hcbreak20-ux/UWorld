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
    this.text.setWordWrapWidth(200);
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
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 180 },
      padding: { x: 10, y: 8 },
    };

    switch (this.bubbleType) {
      case 'shout':
        return {
          ...baseStyle,
          fontSize: '16px',
          fontFamily: 'Arial Black, Arial, sans-serif', // Police grasse
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        };
      case 'whisper':
        return {
          ...baseStyle,
          fontSize: '13px',
          fontStyle: 'italic', // Italique
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
    const padding = 12;
    const width = this.text.width + padding * 2;
    const height = this.text.height + padding * 2;
    const radius = 12;

    // Couleurs selon le type avec CONTOURS ÉPAIS
    let fillColor: number;
    let borderColor: number;
    let borderWidth: number = 4; // CONTOUR ÉPAIS
    let alpha: number;

    switch (this.bubbleType) {
      case 'shout':
        // ROUGE pour crier
        fillColor = 0x2a2a2a; // Fond gris foncé
        borderColor = 0xff0000; // ROUGE VIF
        alpha = 0.95;
        break;
      case 'whisper':
        // BLEU pour chuchoter
        fillColor = 0x2a2a2a; // Fond gris foncé
        borderColor = 0x0088ff; // BLEU VIF
        alpha = 0.9;
        break;
      default:
        // VERT pour parler (normal)
        fillColor = 0x2a2a2a; // Fond gris foncé
        borderColor = 0x00ff00; // VERT VIF
        alpha = 0.9;
    }

    // Dessiner la queue (triangle pointant vers le bas)
    this.tail.clear();
    this.tail.fillStyle(fillColor, alpha);
    this.tail.lineStyle(borderWidth, borderColor, 1);
    this.tail.beginPath();
    this.tail.moveTo(0, height / 2 + 5);
    this.tail.lineTo(-10, height / 2 + 18);
    this.tail.lineTo(10, height / 2 + 18);
    this.tail.closePath();
    this.tail.fillPath();
    this.tail.strokePath();

    // Ombre portée (fond noir légèrement décalé)
    this.background.fillStyle(0x000000, 0.4);
    this.background.fillRoundedRect(
      -width / 2 + 3,
      -height / 2 + 3,
      width,
      height,
      radius
    );

    // Dessiner le fond de la bulle
    this.background.fillStyle(fillColor, alpha);
    this.background.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      radius
    );

    // CONTOUR ÉPAIS COLORÉ
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
    // MONTÉE DÉSACTIVÉE: Les bulles montent quand une nouvelle bulle apparaît
    // On garde juste l'oscillation et l'apparition

    // Légère oscillation horizontale pour effet vivant
    this.scene.tweens.add({
      targets: this,
      x: this.x + 4,
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
    // Mais pas trop petit ni trop grand
    const targetScale = Phaser.Math.Clamp(1 / zoom, 0.6, 1.4);
    this.setScale(targetScale);
  }

  /**
   * Mettre à jour la position et l'échelle (appelé depuis update de la scène)
   */
  public updateBubble(spriteX: number, spriteY: number) {
    // Note: La position est déjà animée par le tween
    // On met juste à jour l'échelle selon le zoom
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
        // Tout le monde voit les cris
        return true;

      case 'whisper':
        // Seulement la cible voit les chuchotements
        return targetUserId === viewerUserId;

      case 'normal':
      default:
        // Distance maximale pour voir un message normal (en cases de grille)
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
