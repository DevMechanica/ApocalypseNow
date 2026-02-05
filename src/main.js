import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

// Detect if device is mobile or desktop
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Inject CSS to remove default canvas margins and set background
const style = document.createElement('style');
style.innerHTML = `
  body {
    margin: 0;
    padding: 0;
    background-color: #0a1428;
    overflow: hidden;
  }
  #game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
  }
  canvas {
    display: block;
    margin: 0 !important;
  }
`;
document.head.appendChild(style);

// Configure scale mode based on device type
const scaleConfig = isMobile ? {
  // Mobile: Fill entire screen
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: '100%',
  height: '100%'
} : {
  // Desktop: Portrait window with fixed aspect ratio
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 720,   // Portrait width
  height: 1280, // Portrait height (9:16 aspect ratio)
  max: {
    width: 720,
    height: 1280
  }
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a1428',
  scale: scaleConfig,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// Handle resize

