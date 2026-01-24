import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { CONFIG } from './config.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a1428',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: 540, // 540x960 (qHD) - Balanced size
        height: 960
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Top down
            debug: false
        }
    },
    scene: [BootScene, PreloadScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
