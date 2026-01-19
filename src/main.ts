import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { GameScene } from './scenes/GameScene';
import { GeneratorPuzzleScene } from './scenes/GeneratorPuzzleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, CutsceneScene, GameScene, GeneratorPuzzleScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
  input: {
    // Restrict input events to only the game canvas
    // This prevents Phaser from capturing clicks outside the canvas
    windowEvents: false
  },
  dom: {
    createContainer: true
  }
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

export default game;
