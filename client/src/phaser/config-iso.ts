import Phaser from 'phaser';
import { LobbySceneIso } from './scenes/LobbySceneIso';

export const createPhaserGame = (parent: string) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent,
    backgroundColor: '#000000', // ✅ Noir pur
    scene: [LobbySceneIso],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: true, // ✅ Important pour les sprites pixel art
      antialias: false,
    },
  };
  return new Phaser.Game(config);
};
