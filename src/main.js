import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a1428',
    scale: {
        mode: Phaser.Scale.FIT,  // Fit to screen while maintaining aspect ratio
        autoCenter: Phaser.Scale.CENTER_BOTH,
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

