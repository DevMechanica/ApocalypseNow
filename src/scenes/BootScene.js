import * as Phaser from 'phaser';
import { CONSTANTS } from '../config.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super(CONSTANTS.SCENES.BOOT);
    }

    create() {
        console.log('BootScene started');
        this.scene.start(CONSTANTS.SCENES.PRELOAD);
    }
}
