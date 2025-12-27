import Phaser from 'phaser';
import { LobbySceneIso } from './scenes/LobbySceneIso';

export const createPhaserGame = (parent: string) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent,
    backgroundColor: '#1a1a2e',
    scene: [LobbySceneIso],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0, x: 0 },
        debug: false, // DÉSACTIVÉ pour enlever les lignes
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
  };

  return new Phaser.Game(config);
};
