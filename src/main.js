import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

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

// Handle resize

