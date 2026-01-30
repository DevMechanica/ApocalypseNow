import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { Three3DOverlay } from './Three3DOverlay.js';

// Inject CSS to remove default canvas margins
const style = document.createElement('style');
style.innerHTML = `
  canvas {
    display: block;
    margin: 0 !important;
  }
`;
document.head.appendChild(style);

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a1428',
  scale: {
    mode: Phaser.Scale.FIT,  // Fit to screen while maintaining aspect ratio
    autoCenter: Phaser.Scale.NO_CENTER, // Rely on CSS Flexbox for centering
    width: 720,   // HD Portrait Width
    height: 1280  // HD Portrait Height
  },
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

// Initialize Three.js Overlay after Phaser is ready
game.events.once('ready', () => {
  const threeContainer = document.getElementById('three-container');
  const overlay = new Three3DOverlay();

  overlay.init(threeContainer, 720, 1280);

  // Load the 3D model
  overlay.loadModel('./textured_mesh.glb')
    .then((model) => {
      console.log('[Main] 3D Model loaded successfully');
    })
    .catch((error) => {
      console.error('[Main] Failed to load 3D model:', error);
    });

  // Expose overlay to Phaser registry for scene access
  game.registry.set('three3D', overlay);

  // Handle window resize
  window.addEventListener('resize', () => {
    const canvas = game.canvas;
    if (canvas && overlay) {
      overlay.resize(canvas.width, canvas.height);
    }
  });
});
